"""
Analyze table design for visualization compatibility
Merkle DAG: import.service.scripts.analyze_table_design
"""
import json
import logging
import os
import asyncio
from pathlib import Path
from typing import Dict, List, Optional, Any

from app.database import get_db_pool, init_db_pool, close_db_pool

logger = logging.getLogger(__name__)


async def analyze_timeline_visualization(pool) -> Dict[str, Any]:
    """
    Analyze timeline visualization requirements
    
    Args:
        pool: Database connection pool
    
    Returns:
        Analysis results
    """
    analysis = {
        'timeline_points_table': {},
        'timeline_emotion_entries': {},
        'physiological_measurements': {},
        'join_analysis': {},
    }
    
    async with pool.acquire() as conn:
        # Check timeline_points table structure
        timeline_points_columns = await conn.fetch("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'timeline_points'
            ORDER BY ordinal_position
        """)
        
        required_columns = ['time', 'word', 'reaction_value', 'reaction_time', 'participant_id', 'session_id']
        existing_columns = [row['column_name'] for row in timeline_points_columns]
        missing_columns = [col for col in required_columns if col not in existing_columns]
        
        analysis['timeline_points_table'] = {
            'exists': len(timeline_points_columns) > 0,
            'columns': {row['column_name']: {'type': row['data_type'], 'nullable': row['is_nullable']} 
                       for row in timeline_points_columns},
            'required_columns': required_columns,
            'missing_columns': missing_columns,
        }
        
        # Check timeline_emotion_entries table
        emotion_entries_columns = await conn.fetch("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'timeline_emotion_entries'
            ORDER BY ordinal_position
        """)
        
        join_columns = ['timeline_point_time', 'timeline_point_participant_id', 'timeline_point_session_id']
        existing_join_columns = [row['column_name'] for row in emotion_entries_columns]
        missing_join_columns = [col for col in join_columns if col not in existing_join_columns]
        
        analysis['timeline_emotion_entries'] = {
            'exists': len(emotion_entries_columns) > 0,
            'columns': {row['column_name']: {'type': row['data_type'], 'nullable': row['is_nullable']} 
                       for row in emotion_entries_columns},
            'join_columns': join_columns,
            'missing_join_columns': missing_join_columns,
            'join_possible': len(missing_join_columns) == 0,
        }
        
        # Check physiological_measurements table
        phys_columns = await conn.fetch("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'physiological_measurements'
            ORDER BY ordinal_position
        """)
        
        phys_join_columns = ['timeline_point_time', 'timeline_point_participant_id', 'timeline_point_session_id']
        existing_phys_join_columns = [row['column_name'] for row in phys_columns]
        missing_phys_join_columns = [col for col in phys_join_columns if col not in existing_phys_join_columns]
        
        analysis['physiological_measurements'] = {
            'exists': len(phys_columns) > 0,
            'columns': {row['column_name']: {'type': row['data_type'], 'nullable': row['is_nullable']} 
                       for row in phys_columns},
            'join_columns': phys_join_columns,
            'missing_join_columns': missing_phys_join_columns,
            'join_possible': len(missing_phys_join_columns) == 0,
        }
        
        # Test JOIN queries
        if len(missing_join_columns) == 0:
            sample_count = await conn.fetchval("""
                SELECT COUNT(*)
                FROM timeline_points tp
                LEFT JOIN timeline_emotion_entries tee ON 
                    tee.timeline_point_time = tp.time AND
                    tee.timeline_point_participant_id = tp.participant_id AND
                    tee.timeline_point_session_id = tp.session_id
                LIMIT 100
            """)
            analysis['join_analysis']['timeline_emotion_entries'] = {
                'join_works': sample_count is not None,
                'sample_count': sample_count or 0,
            }
        
        if len(missing_phys_join_columns) == 0:
            sample_count = await conn.fetchval("""
                SELECT COUNT(*)
                FROM timeline_points tp
                LEFT JOIN physiological_measurements pm ON
                    pm.timeline_point_time = tp.time AND
                    pm.timeline_point_participant_id = tp.participant_id AND
                    pm.timeline_point_session_id = tp.session_id
                LIMIT 100
            """)
            analysis['join_analysis']['physiological_measurements'] = {
                'join_works': sample_count is not None,
                'sample_count': sample_count or 0,
            }
    
    return analysis


async def analyze_3d_force_graph(pool) -> Dict[str, Any]:
    """
    Analyze 3D force graph visualization requirements
    
    Args:
        pool: Database connection pool
    
    Returns:
        Analysis results
    """
    analysis = {
        'word_aggregates_view': {},
        'emotion_vectors_view': {},
    }
    
    async with pool.acquire() as conn:
        # Check timeline_word_aggregates_by_session materialized view
        word_agg_columns = await conn.fetch("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'timeline_word_aggregates_by_session'
            ORDER BY ordinal_position
        """)
        
        required_columns = ['word', 'count', 'avg_reaction_value', 'sum_reaction_value', 
                           'avg_reaction_time', 'sum_reaction_time', 'participant_id', 'session_id']
        existing_columns = [row['column_name'] for row in word_agg_columns]
        missing_columns = [col for col in required_columns if col not in existing_columns]
        
        # Check last refresh time
        last_refresh = await conn.fetchval("""
            SELECT last_refresh_time
            FROM pg_matviews
            WHERE matviewname = 'timeline_word_aggregates_by_session'
        """)
        
        analysis['word_aggregates_view'] = {
            'exists': len(word_agg_columns) > 0,
            'columns': {row['column_name']: {'type': row['data_type']} 
                       for row in word_agg_columns},
            'required_columns': required_columns,
            'missing_columns': missing_columns,
            'last_refreshed': str(last_refresh) if last_refresh else None,
        }
        
        # Check timeline_emotion_vectors_by_word materialized view
        emotion_vec_columns = await conn.fetch("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'timeline_emotion_vectors_by_word'
            ORDER BY ordinal_position
        """)
        
        required_emotion_columns = ['word', 'emotion_by_modality', 'participant_id', 'session_id']
        existing_emotion_columns = [row['column_name'] for row in emotion_vec_columns]
        missing_emotion_columns = [col for col in required_emotion_columns if col not in existing_emotion_columns]
        
        # Check last refresh time
        emotion_last_refresh = await conn.fetchval("""
            SELECT last_refresh_time
            FROM pg_matviews
            WHERE matviewname = 'timeline_emotion_vectors_by_word'
        """)
        
        analysis['emotion_vectors_view'] = {
            'exists': len(emotion_vec_columns) > 0,
            'columns': {row['column_name']: {'type': row['data_type']} 
                       for row in emotion_vec_columns},
            'required_columns': required_emotion_columns,
            'missing_columns': missing_emotion_columns,
            'last_refreshed': str(emotion_last_refresh) if emotion_last_refresh else None,
        }
    
    return analysis


async def analyze_emotion_data_tables(pool) -> Dict[str, Any]:
    """
    Analyze emotion data tables and their relationship to timeline_emotion_entries
    
    Args:
        pool: Database connection pool
    
    Returns:
        Analysis results
    """
    analysis = {
        'hume_tables': {},
        'timeline_emotion_entries_relationship': {},
    }
    
    modalities = ['burst', 'language', 'prosody', 'face']
    table_map = {
        'burst': 'hume_burst_emotion_data',
        'language': 'hume_language_emotion_data',
        'prosody': 'hume_prosody_emotion_data',
        'face': 'hume_face_emotion_data',
    }
    
    async with pool.acquire() as conn:
        for modality in modalities:
            table_name = table_map[modality]
            
            # Check table structure
            columns = await conn.fetch(f"""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = '{table_name}'
                ORDER BY ordinal_position
            """)
            
            required_columns = ['session_id', 'participant_id', 'begin_time', 'end_time']
            existing_columns = [row['column_name'] for row in columns]
            missing_columns = [col for col in required_columns if col not in existing_columns]
            
            # Count records
            record_count = await conn.fetchval(f"SELECT COUNT(*) FROM {table_name}")
            
            # Check relationship with timeline_emotion_entries
            # This would require checking if there's a mechanism to link them
            # For now, we'll check if the tables have compatible keys
            
            analysis['hume_tables'][modality] = {
                'table_name': table_name,
                'exists': len(columns) > 0,
                'columns': {row['column_name']: {'type': row['data_type'], 'nullable': row['is_nullable']} 
                           for row in columns},
                'required_columns': required_columns,
                'missing_columns': missing_columns,
                'record_count': record_count or 0,
            }
        
        # Check timeline_emotion_entries structure
        tee_columns = await conn.fetch("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'timeline_emotion_entries'
            ORDER BY ordinal_position
        """)
        
        # Check if there's a way to link hume tables to timeline_emotion_entries
        # This might require checking for foreign keys or join conditions
        analysis['timeline_emotion_entries_relationship'] = {
            'columns': {row['column_name']: {'type': row['data_type'], 'nullable': row['is_nullable']} 
                       for row in tee_columns},
            'can_link_to_hume_tables': 'file_type' in [row['column_name'] for row in tee_columns],
        }
    
    return analysis


async def analyze_table_design() -> Dict[str, Any]:
    """
    Analyze table design for visualization compatibility
    
    Returns:
        Comprehensive analysis report
    """
    database_url = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@postgres:5432/spirit_in_physics'
    )
    
    await init_db_pool(database_url)
    
    try:
        pool = await get_db_pool()
        
        from datetime import datetime
        analysis = {
            'timestamp': datetime.now().isoformat(),
            'timeline_visualization': await analyze_timeline_visualization(pool),
            '3d_force_graph': await analyze_3d_force_graph(pool),
            'emotion_data_tables': await analyze_emotion_data_tables(pool),
            'recommendations': [],
        }
        
        # Generate recommendations
        recommendations = []
        
        # Check timeline visualization
        timeline_analysis = analysis['timeline_visualization']
        if timeline_analysis['timeline_points_table'].get('missing_columns'):
            recommendations.append(
                f"Timeline visualization: Missing columns in timeline_points: "
                f"{', '.join(timeline_analysis['timeline_points_table']['missing_columns'])}"
            )
        
        if not timeline_analysis['timeline_emotion_entries'].get('join_possible'):
            recommendations.append(
                "Timeline visualization: Cannot join timeline_emotion_entries - missing join columns"
            )
        
        # Check 3D force graph
        force_analysis = analysis['3d_force_graph']
        if force_analysis['word_aggregates_view'].get('missing_columns'):
            recommendations.append(
                f"3D Force Graph: Missing columns in word_aggregates view: "
                f"{', '.join(force_analysis['word_aggregates_view']['missing_columns'])}"
            )
        
        if not force_analysis['word_aggregates_view'].get('last_refreshed'):
            recommendations.append(
                "3D Force Graph: word_aggregates view may need refresh"
            )
        
        if not force_analysis['emotion_vectors_view'].get('last_refreshed'):
            recommendations.append(
                "3D Force Graph: emotion_vectors view may need refresh"
            )
        
        analysis['recommendations'] = recommendations
        
        return analysis
    
    finally:
        await close_db_pool()


async def main():
    """Main function"""
    import sys
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    output_file = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("table_design_analysis.json")
    
    analysis = await analyze_table_design()
    
    with open(output_file, 'w') as f:
        json.dump(analysis, f, indent=2)
    
    print(json.dumps(analysis, indent=2))


if __name__ == "__main__":
    asyncio.run(main())

