"""
Integrated validation pipeline for CSV/JSON → Parquet → PostgreSQL
Merkle DAG: import.service.scripts.validate_pipeline
"""
import json
import logging
import os
import asyncio
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime

from app.database import init_db_pool, close_db_pool
from app.scripts.count_data_points import count_all_participants_data_points
from app.scripts.validate_parquet import validate_parquet_files, compare_with_source
from app.scripts.validate_postgres_import import count_postgres_data_points, compare_with_parquet

logger = logging.getLogger(__name__)


def generate_validation_report(
    source_counts: Dict[str, Any],
    parquet_counts: Dict[str, Any],
    postgres_counts: Dict[str, Any],
    source_to_parquet_comparison: Dict[str, Any],
    parquet_to_postgres_comparison: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate comprehensive validation report
    
    Args:
        source_counts: Source CSV/JSON counts
        parquet_counts: Parquet file counts
        postgres_counts: PostgreSQL table counts
        source_to_parquet_comparison: Comparison results
        parquet_to_postgres_comparison: Comparison results
    
    Returns:
        Validation report
    """
    report = {
        'timestamp': datetime.now().isoformat(),
        'summary': {
            'total_participants': len(source_counts),
            'source_to_parquet_match': 0,
            'source_to_parquet_mismatch': 0,
            'parquet_to_postgres_match': 0,
            'parquet_to_postgres_mismatch': 0,
        },
        'participants': {},
    }
    
    # Process each participant
    for participant_id in source_counts.keys():
        participant_report = {
            'participant_id': participant_id,
            'modalities': {},
        }
        
        for modality in ['burst', 'language', 'prosody', 'face']:
            modality_report = {
                'modality': modality,
                'source_counts': {},
                'parquet_counts': {},
                'postgres_counts': {},
                'validations': {},
                'errors': [],
            }
            
            # Collect counts
            if participant_id in source_counts:
                source_modalities = source_counts[participant_id]
                if modality in source_modalities:
                    modality_report['source_counts'] = source_modalities[modality]
            
            if participant_id in parquet_counts:
                parquet_sessions = parquet_counts[participant_id]
                modality_report['parquet_counts'] = {
                    session_id: counts.get(modality, 0)
                    for session_id, counts in parquet_sessions.items()
                }
            
            if participant_id in postgres_counts:
                postgres_sessions = postgres_counts[participant_id]
                modality_report['postgres_counts'] = {
                    session_id: counts.get(modality, {}).get('data_count', 0)
                    for session_id, counts in postgres_sessions.items()
                }
            
            # Validate
            if participant_id in source_to_parquet_comparison:
                source_comp = source_to_parquet_comparison[participant_id]
                for session_id, session_data in source_comp.items():
                    if modality in session_data:
                        validation = session_data[modality]
                        modality_report['validations'][f'source_to_parquet_{session_id}'] = validation['validation']
                        if validation['validation'] == 'match':
                            report['summary']['source_to_parquet_match'] += 1
                        else:
                            report['summary']['source_to_parquet_mismatch'] += 1
                            modality_report['errors'].append(
                                f"Source to Parquet mismatch for {session_id}: "
                                f"difference={validation['difference']}"
                            )
            
            if participant_id in parquet_to_postgres_comparison:
                parquet_comp = parquet_to_postgres_comparison[participant_id]
                for session_id, session_data in parquet_comp.items():
                    if modality in session_data:
                        validation = session_data[modality]
                        modality_report['validations'][f'parquet_to_postgres_{session_id}'] = validation['validation']
                        if validation['validation'] == 'match':
                            report['summary']['parquet_to_postgres_match'] += 1
                        else:
                            report['summary']['parquet_to_postgres_mismatch'] += 1
                            modality_report['errors'].append(
                                f"Parquet to PostgreSQL mismatch for {session_id}: "
                                f"difference={validation['difference']}"
                            )
            
            participant_report['modalities'][modality] = modality_report
        
        report['participants'][participant_id] = participant_report
    
    return report


async def validate_full_pipeline(
    dataset_path: Path,
    processed_path: Path,
    output_file: Optional[Path] = None
) -> Dict[str, Any]:
    """
    Validate the full pipeline: CSV/JSON → Parquet → PostgreSQL
    
    Args:
        dataset_path: Path to dataset directory
        processed_path: Path to processed Parquet directory
        output_file: Optional path to save report JSON
    
    Returns:
        Validation report
    """
    logger.info("Starting pipeline validation...")
    
    # 1. Count source data points
    logger.info("Step 1: Counting source data points (CSV/JSON)...")
    source_counts = count_all_participants_data_points(dataset_path)
    
    # 2. Count Parquet data points
    logger.info("Step 2: Counting Parquet data points...")
    parquet_counts = validate_parquet_files(processed_path)
    
    # 3. Compare source to Parquet
    logger.info("Step 3: Comparing source to Parquet...")
    source_to_parquet_comparison = compare_with_source(parquet_counts, source_counts)
    
    # 4. Count PostgreSQL data points
    logger.info("Step 4: Counting PostgreSQL data points...")
    database_url = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@postgres:5432/spirit_in_physics'
    )
    await init_db_pool(database_url)
    try:
        postgres_counts = await count_postgres_data_points()
    finally:
        await close_db_pool()
    
    # 5. Compare Parquet to PostgreSQL
    logger.info("Step 5: Comparing Parquet to PostgreSQL...")
    from app.scripts.validate_postgres_import import compare_with_parquet
    parquet_to_postgres_comparison = await compare_with_parquet(postgres_counts, parquet_counts)
    
    # 6. Generate report
    logger.info("Step 6: Generating validation report...")
    report = generate_validation_report(
        source_counts,
        parquet_counts,
        postgres_counts,
        source_to_parquet_comparison,
        parquet_to_postgres_comparison
    )
    
    # 7. Save report if output file specified
    if output_file:
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        logger.info(f"Report saved to {output_file}")
    
    return report


async def main():
    """Main function"""
    import sys
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    dataset_path = Path(os.getenv("DATASET_PATH", "/app/dataset/participants"))
    processed_path = Path(os.getenv("PROCESSED_PATH", "/app/processed"))
    output_file = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("validation_report.json")
    
    report = await validate_full_pipeline(dataset_path, processed_path, output_file)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    asyncio.run(main())

