"""
Validate Parquet files and count data points
Merkle DAG: import.service.scripts.validate_parquet
"""
import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional
import pandas as pd

logger = logging.getLogger(__name__)


def count_parquet_points(parquet_path: Path) -> int:
    """
    Count data points in Parquet file
    
    Args:
        parquet_path: Path to Parquet file
    
    Returns:
        Number of data points (rows)
    """
    try:
        df = pd.read_parquet(parquet_path)
        return len(df)
    except Exception as e:
        logger.error(f"Error counting Parquet points in {parquet_path}: {e}")
        return 0


def validate_parquet_files(
    processed_path: Path,
    version: str = "v1"
) -> Dict[str, Dict[str, Dict[str, int]]]:
    """
    Validate and count data points in all Parquet files
    
    Args:
        processed_path: Base path to processed directory
        version: Version string (default: v1)
    
    Returns:
        Dict with structure: {participant_id: {session_id: {modality: count}}}
    """
    results = {}
    
    version_path = processed_path / version
    if not version_path.exists():
        logger.warning(f"Version directory not found: {version_path}")
        return results
    
    # Iterate through participant directories
    for participant_dir in version_path.iterdir():
        if not participant_dir.is_dir():
            continue
        
        participant_id = participant_dir.name
        results[participant_id] = {}
        
        # Iterate through session directories
        for session_dir in participant_dir.iterdir():
            if not session_dir.is_dir():
                continue
            
            session_id = session_dir.name
            results[participant_id][session_id] = {}
            
            # Count points in each modality Parquet file
            modalities = ['burst', 'language', 'prosody', 'face']
            for modality in modalities:
                parquet_file = session_dir / f"{modality}.parquet"
                if parquet_file.exists():
                    count = count_parquet_points(parquet_file)
                    results[participant_id][session_id][modality] = count
                else:
                    results[participant_id][session_id][modality] = 0
    
    return results


def compare_with_source(
    parquet_counts: Dict[str, Dict[str, Dict[str, int]]],
    source_counts: Dict[str, Dict[str, Dict[str, Dict[str, int]]]]
) -> Dict[str, Dict[str, Dict[str, Dict[str, any]]]]:
    """
    Compare Parquet counts with source CSV/JSON counts
    
    Args:
        parquet_counts: Parquet file counts
        source_counts: Source file counts (from count_data_points.py)
    
    Returns:
        Comparison results with validation status
    """
    comparison = {}
    
    for participant_id, parquet_sessions in parquet_counts.items():
        if participant_id not in source_counts:
            continue
        
        comparison[participant_id] = {}
        source_modalities = source_counts[participant_id]
        
        for session_id, parquet_modalities in parquet_sessions.items():
            comparison[participant_id][session_id] = {}
            
            for modality, parquet_count in parquet_modalities.items():
                if modality not in source_modalities:
                    continue
                
                source_sessions = source_modalities[modality]
                csv_count = 0
                json_count = 0
                
                # Sum counts from all sessions (since we might not have exact session mapping)
                for sess_id, counts in source_sessions.items():
                    csv_count += counts.get('csv', 0)
                    json_count += counts.get('json', 0)
                
                # Compare: Parquet should match CSV (JSON might be subset)
                total_source = csv_count + json_count
                match_status = "match" if parquet_count == csv_count else "mismatch"
                
                comparison[participant_id][session_id][modality] = {
                    'parquet_count': parquet_count,
                    'csv_count': csv_count,
                    'json_count': json_count,
                    'total_source_count': total_source,
                    'validation': match_status,
                    'difference': parquet_count - csv_count,
                }
    
    return comparison


if __name__ == "__main__":
    import sys
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    processed_path = Path(os.getenv("PROCESSED_PATH", "/app/processed"))
    
    if len(sys.argv) > 1 and sys.argv[1] == "compare":
        # Compare with source counts (requires source_counts.json)
        source_counts_file = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("source_counts.json")
        if source_counts_file.exists():
            with open(source_counts_file, 'r') as f:
                source_counts = json.load(f)
            
            parquet_counts = validate_parquet_files(processed_path)
            comparison = compare_with_source(parquet_counts, source_counts)
            print(json.dumps(comparison, indent=2))
        else:
            logger.error(f"Source counts file not found: {source_counts_file}")
    else:
        # Just count Parquet files
        results = validate_parquet_files(processed_path)
        print(json.dumps(results, indent=2))

