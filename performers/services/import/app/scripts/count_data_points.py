"""
Count data points from CSV and JSON files
Merkle DAG: import.service.scripts.count_data_points
"""
import csv
import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import pandas as pd

from app.processors.json_loader import load_predictions_json

logger = logging.getLogger(__name__)


def count_csv_points(csv_path: Path, modality: str) -> int:
    """
    Count data points in CSV file
    
    Args:
        csv_path: Path to CSV file
        modality: One of 'burst', 'language', 'prosody', 'face'
    
    Returns:
        Number of data points (rows)
    """
    try:
        df = pd.read_csv(csv_path)
        return len(df)  # 各行が1データポイント
    except Exception as e:
        logger.error(f"Error counting CSV points in {csv_path}: {e}")
        return 0


def count_json_points(json_path: Path, modality: str) -> int:
    """
    Count data points in JSON predictions file
    
    Args:
        json_path: Path to JSON file
        modality: One of 'burst', 'language', 'prosody', 'face'
    
    Returns:
        Number of data points (predictions)
    """
    try:
        data = load_predictions_json(json_path)
        predictions = data.get('predictions', [])
        count = 0
        
        for prediction in predictions:
            models = prediction.get('models', {})
            if modality in models:
                model_data = models[modality]
                grouped_predictions = model_data.get('grouped_predictions', [])
                for grouped in grouped_predictions:
                    count += len(grouped.get('predictions', []))
        
        return count
    except Exception as e:
        logger.error(f"Error counting JSON points in {json_path}: {e}")
        return 0


def count_participant_data_points(
    participant_id: str,
    participant_path: Path
) -> Dict[str, Dict[str, Dict[str, int]]]:
    """
    Count data points for a participant across all modalities and sessions
    
    Args:
        participant_id: Participant ID
        participant_path: Path to participant directory
    
    Returns:
        Dict with structure: {modality: {session_id: {source: count}}}
        source can be 'csv' or 'json'
    """
    results = {
        'burst': {},
        'language': {},
        'prosody': {},
        'face': {},
    }
    
    # Find HumeAI artifacts directories
    hume_artifacts_dirs = list(participant_path.glob("HumeAI_artifacts_*"))
    
    for artifacts_dir in hume_artifacts_dirs:
        # Find registry_file directories
        registry_dirs = list(artifacts_dir.glob("registry_file-*"))
        
        for registry_dir in registry_dirs:
            # Extract session_index from directory name
            session_index = None
            try:
                parts = registry_dir.name.split('-')
                if len(parts) >= 2 and parts[0] == 'registry_file':
                    session_index = int(parts[1])
            except (ValueError, IndexError):
                pass
            
            if session_index is None:
                continue
            
            session_id = f"session_{session_index}"  # Placeholder, will be replaced with actual session_id
            
            # Find CSV files
            csv_dir = registry_dir / "csv" / registry_dir.name
            if csv_dir.exists():
                modalities = ['burst', 'language', 'prosody', 'face']
                for modality in modalities:
                    csv_file = csv_dir / f"{modality}.csv"
                    if csv_file.exists():
                        count = count_csv_points(csv_file, modality)
                        if session_id not in results[modality]:
                            results[modality][session_id] = {'csv': 0, 'json': 0}
                        results[modality][session_id]['csv'] += count
        
        # Find JSON files
        json_files = list(artifacts_dir.glob("HumeAI_predictions_*.json"))
        for json_file in json_files:
            # JSON files are typically associated with registry_file-0
            session_id = "session_0"  # Placeholder
            
            modalities = ['burst', 'language', 'prosody', 'face']
            for modality in modalities:
                count = count_json_points(json_file, modality)
                if count > 0:
                    if session_id not in results[modality]:
                        results[modality][session_id] = {'csv': 0, 'json': 0}
                    results[modality][session_id]['json'] += count
    
    return results


def count_all_participants_data_points(
    dataset_path: Path
) -> Dict[str, Dict[str, Dict[str, Dict[str, int]]]]:
    """
    Count data points for all participants
    
    Args:
        dataset_path: Path to dataset directory
    
    Returns:
        Dict with structure: {participant_id: {modality: {session_id: {source: count}}}}
    """
    all_results = {}
    
    if not dataset_path.exists():
        logger.error(f"Dataset directory not found: {dataset_path}")
        return all_results
    
    participant_dirs = [d for d in dataset_path.iterdir() if d.is_dir()]
    
    for participant_dir in participant_dirs:
        participant_id = participant_dir.name
        logger.info(f"Counting data points for participant {participant_id}")
        
        results = count_participant_data_points(participant_id, participant_dir)
        all_results[participant_id] = results
    
    return all_results


if __name__ == "__main__":
    import sys
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    dataset_path = Path(os.getenv("DATASET_PATH", "/app/dataset/participants"))
    
    if len(sys.argv) > 1:
        participant_id = sys.argv[1]
        participant_path = dataset_path / participant_id
        if participant_path.exists():
            results = count_participant_data_points(participant_id, participant_path)
            print(json.dumps(results, indent=2))
        else:
            logger.error(f"Participant directory not found: {participant_path}")
    else:
        results = count_all_participants_data_points(dataset_path)
        print(json.dumps(results, indent=2))

