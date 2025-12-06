"""
Prefect workflow for data validation
Merkle DAG: import.service.workflows.validation
"""
import json
import logging
import os
from pathlib import Path
from typing import Dict, Any, Optional
from prefect import flow, task
from prefect.logging import get_run_logger

from app.database import init_db_pool, close_db_pool
from app.scripts.count_data_points import count_all_participants_data_points, count_participant_data_points
from app.scripts.validate_parquet import validate_parquet_files, compare_with_source
from app.scripts.validate_postgres_import import count_postgres_data_points, compare_with_parquet
from app.scripts.validate_pipeline import validate_full_pipeline
from app.scripts.analyze_table_design import analyze_table_design

logger = logging.getLogger(__name__)


@task(name="count-source-data-points")
def count_source_data_points_task(
    dataset_path: Path,
    participant_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Count data points in source CSV/JSON files
    
    Args:
        dataset_path: Path to dataset directory
        participant_id: Optional participant ID to filter
    
    Returns:
        Source data point counts
    """
    log = get_run_logger()
    
    if participant_id:
        participant_path = dataset_path / participant_id
        if participant_path.exists():
            results = count_participant_data_points(participant_id, participant_path)
            log.info(f"Counted source data points for participant {participant_id}")
            return {participant_id: results}
        else:
            log.error(f"Participant directory not found: {participant_path}")
            return {}
    else:
        results = count_all_participants_data_points(dataset_path)
        log.info(f"Counted source data points for all participants")
        return results


@task(name="count-parquet-data-points")
def count_parquet_data_points_task(
    processed_path: Path,
    version: str = "v1"
) -> Dict[str, Any]:
    """
    Count data points in Parquet files
    
    Args:
        processed_path: Base path to processed directory
        version: Version string
    
    Returns:
        Parquet data point counts
    """
    log = get_run_logger()
    
    results = validate_parquet_files(processed_path, version)
    log.info(f"Counted Parquet data points")
    return results


@task(name="count-postgres-data-points")
async def count_postgres_data_points_task(
    participant_id: Optional[str] = None,
    session_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Count data points in PostgreSQL tables
    
    Args:
        participant_id: Optional participant ID filter
        session_id: Optional session ID filter
    
    Returns:
        PostgreSQL data point counts
    """
    log = get_run_logger()
    
    database_url = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@postgres:5432/spirit_in_physics'
    )
    
    await init_db_pool(database_url)
    try:
        results = await count_postgres_data_points(participant_id, session_id)
        log.info(f"Counted PostgreSQL data points")
        return results
    finally:
        await close_db_pool()


@task(name="compare-source-to-parquet")
def compare_source_to_parquet_task(
    parquet_counts: Dict[str, Any],
    source_counts: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Compare source counts with Parquet counts
    
    Args:
        parquet_counts: Parquet file counts
        source_counts: Source file counts
    
    Returns:
        Comparison results
    """
    log = get_run_logger()
    
    comparison = compare_with_source(parquet_counts, source_counts)
    log.info("Compared source to Parquet")
    return comparison


@task(name="compare-parquet-to-postgres")
async def compare_parquet_to_postgres_task(
    postgres_counts: Dict[str, Any],
    parquet_counts: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Compare Parquet counts with PostgreSQL counts
    
    Args:
        postgres_counts: PostgreSQL table counts
        parquet_counts: Parquet file counts
    
    Returns:
        Comparison results
    """
    log = get_run_logger()
    
    comparison = await compare_with_parquet(postgres_counts, parquet_counts)
    log.info("Compared Parquet to PostgreSQL")
    return comparison


@task(name="analyze-table-design")
async def analyze_table_design_task() -> Dict[str, Any]:
    """
    Analyze table design for visualization compatibility
    
    Returns:
        Table design analysis
    """
    log = get_run_logger()
    
    analysis = await analyze_table_design()
    log.info("Analyzed table design")
    return analysis


@flow(name="validate-data-pipeline")
async def validate_data_pipeline_workflow(
    dataset_path: Optional[str] = None,
    processed_path: Optional[str] = None,
    participant_id: Optional[str] = None,
    output_file: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main workflow for validating the data pipeline
    
    Args:
        dataset_path: Path to dataset directory
        processed_path: Path to processed Parquet directory
        participant_id: Optional participant ID to filter
        output_file: Optional path to save report JSON
    
    Returns:
        Validation report
    """
    log = get_run_logger()
    
    dataset_path_obj = Path(dataset_path) if dataset_path else Path(os.getenv("DATASET_PATH", "/app/dataset/participants"))
    processed_path_obj = Path(processed_path) if processed_path else Path(os.getenv("PROCESSED_PATH", "/app/processed"))
    output_file_obj = Path(output_file) if output_file else Path("validation_report.json")
    
    log.info("Starting data pipeline validation workflow...")
    
    # Step 1: Count source data points
    log.info("Step 1: Counting source data points...")
    source_counts = count_source_data_points_task(dataset_path_obj, participant_id)
    
    # Step 2: Count Parquet data points
    log.info("Step 2: Counting Parquet data points...")
    parquet_counts = count_parquet_data_points_task(processed_path_obj)
    
    # Step 3: Compare source to Parquet
    log.info("Step 3: Comparing source to Parquet...")
    source_to_parquet_comparison = compare_source_to_parquet_task(parquet_counts, source_counts)
    
    # Step 4: Count PostgreSQL data points
    log.info("Step 4: Counting PostgreSQL data points...")
    postgres_counts = await count_postgres_data_points_task(participant_id)
    
    # Step 5: Compare Parquet to PostgreSQL
    log.info("Step 5: Comparing Parquet to PostgreSQL...")
    parquet_to_postgres_comparison = await compare_parquet_to_postgres_task(postgres_counts, parquet_counts)
    
    # Step 6: Analyze table design
    log.info("Step 6: Analyzing table design...")
    table_design_analysis = await analyze_table_design_task()
    
    # Step 7: Generate comprehensive report
    log.info("Step 7: Generating validation report...")
    report = {
        'source_counts': source_counts,
        'parquet_counts': parquet_counts,
        'postgres_counts': postgres_counts,
        'source_to_parquet_comparison': source_to_parquet_comparison,
        'parquet_to_postgres_comparison': parquet_to_postgres_comparison,
        'table_design_analysis': table_design_analysis,
    }
    
    # Save report
    with open(output_file_obj, 'w') as f:
        json.dump(report, f, indent=2)
    
    log.info(f"Validation report saved to {output_file_obj}")
    
    return report

