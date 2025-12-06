"""
Prefect workflow for processing all participants
Merkle DAG: import.service.workflows.participants
"""
import logging
import os
from pathlib import Path
from typing import List, Dict, Any
from prefect import flow, task
from prefect.logging import get_run_logger

from .emotions import process_emotions_workflow

logger = logging.getLogger(__name__)


@task(name="list-participants")
def list_participants(dataset_path: Path) -> List[str]:
    """
    List all participant directories
    
    Args:
        dataset_path: Path to dataset directory
    
    Returns:
        List of participant IDs
    """
    log = get_run_logger()
    
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset directory not found: {dataset_path}")
    
    participant_dirs = [d.name for d in dataset_path.iterdir() if d.is_dir()]
    log.info(f"Found {len(participant_dirs)} participants")
    return participant_dirs


@flow(name="process-all-participants")
async def process_all_participants_workflow() -> Dict[str, Any]:
    """
    Main workflow for processing all participants
    
    Returns:
        Dict with processing results
    """
    log = get_run_logger()
    
    dataset_path = Path(os.getenv("DATASET_PATH", "/app/dataset/participants"))
    
    # List all participants
    participant_ids = list_participants(dataset_path)
    
    results = {
        'total_participants': len(participant_ids),
        'processed': 0,
        'failed': 0,
        'participant_results': [],
    }
    
    # Process each participant
    for participant_id in participant_ids:
        try:
            log.info(f"Processing participant {participant_id}")
            participant_result = await process_emotions_workflow(participant_id)
            results['participant_results'].append(participant_result)
            results['processed'] += 1
        except Exception as e:
            log.error(f"Error processing participant {participant_id}: {e}", exc_info=True)
            results['failed'] += 1
            results['participant_results'].append({
                'participant_id': participant_id,
                'error': str(e),
            })
    
    log.info(f"Processed {results['processed']} participants, {results['failed']} failed")
    return results

