"""
Validate PostgreSQL import and count data points
Merkle DAG: import.service.scripts.validate_postgres_import
"""
import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional, Any
import asyncio

from app.database import get_db_pool, init_db_pool, close_db_pool

logger = logging.getLogger(__name__)


async def count_postgres_data_points(
    participant_id: Optional[str] = None,
    session_id: Optional[str] = None
) -> Dict[str, Dict[str, Dict[str, int]]]:
    """
    Count data points in PostgreSQL tables
    
    Args:
        participant_id: Optional participant ID filter
        session_id: Optional session ID filter
    
    Returns:
        Dict with structure: {participant_id: {session_id: {modality: {data_count, scores_count}}}}
    """
    pool = await get_db_pool()
    results = {}
    
    modalities = ['burst', 'language', 'prosody', 'face']
    table_map = {
        'burst': 'hume_burst_emotion_data',
        'language': 'hume_language_emotion_data',
        'prosody': 'hume_prosody_emotion_data',
        'face': 'hume_face_emotion_data',
    }
    scores_table_map = {
        'burst': 'hume_burst_emotion_scores',
        'language': 'hume_language_emotion_scores',
        'prosody': 'hume_prosody_emotion_scores',
        'face': 'hume_face_emotion_scores',
    }
    
    async with pool.acquire() as conn:
        # Get all participants and sessions
        if participant_id:
            participants_query = "SELECT id::text FROM participants WHERE id::text = $1"
            participants = await conn.fetch(participants_query, participant_id)
        else:
            participants_query = "SELECT id::text FROM participants"
            participants = await conn.fetch(participants_query)
        
        for participant_row in participants:
            p_id = participant_row['id']
            results[p_id] = {}
            
            # Get sessions for this participant
            if session_id:
                sessions_query = "SELECT id::text FROM sessions WHERE participant_id::text = $1 AND id::text = $2"
                sessions = await conn.fetch(sessions_query, p_id, session_id)
            else:
                sessions_query = "SELECT id::text FROM sessions WHERE participant_id::text = $1"
                sessions = await conn.fetch(sessions_query, p_id)
            
            for session_row in sessions:
                s_id = session_row['id']
                results[p_id][s_id] = {}
                
                for modality in modalities:
                    data_table = table_map[modality]
                    scores_table = scores_table_map[modality]
                    
                    # Count data entries
                    data_count_query = f"""
                        SELECT COUNT(*) as count
                        FROM {data_table}
                        WHERE participant_id::text = $1 AND session_id::text = $2
                    """
                    data_count_row = await conn.fetchrow(data_count_query, p_id, s_id)
                    data_count = data_count_row['count'] if data_count_row else 0
                    
                    # Count emotion scores
                    # Map data table to scores table foreign key column
                    fk_column_map = {
                        'hume_burst_emotion_data': 'hume_burst_emotion_data_id',
                        'hume_language_emotion_data': 'hume_language_emotion_data_id',
                        'hume_prosody_emotion_data': 'hume_prosody_emotion_data_id',
                        'hume_face_emotion_data': 'hume_face_emotion_data_id',
                    }
                    fk_column = fk_column_map.get(data_table, f"{data_table.replace('_data', '_emotion_data_id')}")
                    
                    scores_count_query = f"""
                        SELECT COUNT(*) as count
                        FROM {scores_table}
                        WHERE {fk_column} IN (
                            SELECT id FROM {data_table}
                            WHERE participant_id::text = $1 AND session_id::text = $2
                        )
                    """
                    scores_count_row = await conn.fetchrow(scores_count_query, p_id, s_id)
                    scores_count = scores_count_row['count'] if scores_count_row else 0
                    
                    results[p_id][s_id][modality] = {
                        'data_count': data_count,
                        'scores_count': scores_count,
                    }
    
    return results


async def compare_with_parquet(
    postgres_counts: Dict[str, Dict[str, Dict[str, Dict[str, int]]]],
    parquet_counts: Dict[str, Dict[str, Dict[str, int]]]
) -> Dict[str, Dict[str, Dict[str, Dict[str, Any]]]]:
    """
    Compare PostgreSQL counts with Parquet counts
    
    Args:
        postgres_counts: PostgreSQL table counts
        parquet_counts: Parquet file counts
    
    Returns:
        Comparison results with validation status
    """
    comparison = {}
    
    for participant_id, postgres_sessions in postgres_counts.items():
        if participant_id not in parquet_counts:
            continue
        
        comparison[participant_id] = {}
        parquet_sessions = parquet_counts[participant_id]
        
        for session_id, postgres_modalities in postgres_sessions.items():
            if session_id not in parquet_sessions:
                continue
            
            comparison[participant_id][session_id] = {}
            parquet_modalities = parquet_sessions[session_id]
            
            for modality, postgres_counts_mod in postgres_modalities.items():
                if modality not in parquet_modalities:
                    continue
                
                parquet_count = parquet_modalities[modality]
                postgres_data_count = postgres_counts_mod['data_count']
                postgres_scores_count = postgres_counts_mod['scores_count']
                
                match_status = "match" if parquet_count == postgres_data_count else "mismatch"
                
                comparison[participant_id][session_id][modality] = {
                    'parquet_count': parquet_count,
                    'postgres_data_count': postgres_data_count,
                    'postgres_scores_count': postgres_scores_count,
                    'validation': match_status,
                    'difference': postgres_data_count - parquet_count,
                }
    
    return comparison


async def main():
    """Main function"""
    import sys
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    database_url = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@postgres:5432/spirit_in_physics'
    )
    
    await init_db_pool(database_url)
    
    try:
        participant_id = sys.argv[1] if len(sys.argv) > 1 else None
        session_id = sys.argv[2] if len(sys.argv) > 2 else None
        
        if len(sys.argv) > 3 and sys.argv[3] == "compare":
            # Compare with Parquet counts
            parquet_counts_file = Path(sys.argv[4]) if len(sys.argv) > 4 else Path("parquet_counts.json")
            if parquet_counts_file.exists():
                with open(parquet_counts_file, 'r') as f:
                    parquet_counts = json.load(f)
                
                postgres_counts = await count_postgres_data_points(participant_id, session_id)
                comparison = await compare_with_parquet(postgres_counts, parquet_counts)
                print(json.dumps(comparison, indent=2))
            else:
                logger.error(f"Parquet counts file not found: {parquet_counts_file}")
        else:
            # Just count PostgreSQL data
            results = await count_postgres_data_points(participant_id, session_id)
            print(json.dumps(results, indent=2))
    finally:
        await close_db_pool()


if __name__ == "__main__":
    asyncio.run(main())

