"""
Prefect workflow for processing emotion data
Merkle DAG: import.service.workflows.emotions
"""
import logging
import os
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
from prefect import flow, task
from prefect.logging import get_run_logger

from app.database import get_db_pool
from app.processors import (
    load_burst_csv,
    load_language_csv,
    load_prosody_csv,
    load_face_csv,
    load_predictions_json,
    convert_json_to_dataframe,
    validate_with_pandera,
    save_to_parquet,
    import_parquet_to_db,
)
from app.routers.emotions import extract_session_index_from_registry_dir

logger = logging.getLogger(__name__)


@task(name="detect-emotion-files")
def detect_emotion_files(participant_id: str, participant_path: Path) -> Dict[str, List[Path]]:
    """
    Detect CSV and JSON files for emotion data
    
    Returns:
        Dict with keys: 'csv_burst', 'csv_language', 'csv_prosody', 'csv_face', 'json'
    """
    log = get_run_logger()
    
    files = {
        'csv_burst': [],
        'csv_language': [],
        'csv_prosody': [],
        'csv_face': [],
        'json': [],
    }
    
    # Find HumeAI artifacts directories
    hume_artifacts_dirs = list(participant_path.glob("HumeAI_artifacts_*"))
    
    for artifacts_dir in hume_artifacts_dirs:
        # Find registry_file directories
        registry_dirs = list(artifacts_dir.glob("registry_file-*"))
        
        for registry_dir in registry_dirs:
            # Find CSV files
            csv_dir = registry_dir / "csv" / registry_dir.name
            if csv_dir.exists():
                burst_csv = csv_dir / "burst.csv"
                language_csv = csv_dir / "language.csv"
                prosody_csv = csv_dir / "prosody.csv"
                face_csv = csv_dir / "face.csv"
                
                if burst_csv.exists():
                    files['csv_burst'].append(burst_csv)
                if language_csv.exists():
                    files['csv_language'].append(language_csv)
                if prosody_csv.exists():
                    files['csv_prosody'].append(prosody_csv)
                if face_csv.exists():
                    files['csv_face'].append(face_csv)
        
        # Find JSON files
        json_files = list(artifacts_dir.glob("HumeAI_predictions_*.json"))
        files['json'].extend(json_files)
    
    log.info(f"Detected {sum(len(v) for v in files.values())} emotion files for participant {participant_id}")
    return files


@task(name="load-csv-data")
def load_csv_data(csv_files: List[Path], modality: str) -> List[Any]:
    """
    Load CSV files into DataFrames
    
    Args:
        csv_files: List of CSV file paths
        modality: One of 'burst', 'language', 'prosody', 'face'
    
    Returns:
        List of DataFrames
    """
    log = get_run_logger()
    
    loader_map = {
        'burst': load_burst_csv,
        'language': load_language_csv,
        'prosody': load_prosody_csv,
        'face': load_face_csv,
    }
    
    loader = loader_map.get(modality)
    if not loader:
        raise ValueError(f"Unknown modality: {modality}")
    
    dataframes = []
    for csv_file in csv_files:
        try:
            df = loader(csv_file)
            dataframes.append(df)
            log.info(f"Loaded {len(df)} rows from {csv_file}")
        except Exception as e:
            log.error(f"Error loading {csv_file}: {e}")
            raise
    
    return dataframes


@task(name="load-json-data")
def load_json_data(json_files: List[Path], modality: str, participant_id: str, session_id: str) -> List[Any]:
    """
    Load JSON files and convert to DataFrames
    
    Args:
        json_files: List of JSON file paths
        modality: One of 'burst', 'language', 'prosody', 'face'
        participant_id: Participant ID
        session_id: Session ID
    
    Returns:
        List of DataFrames
    """
    log = get_run_logger()
    
    dataframes = []
    for json_file in json_files:
        try:
            json_data = load_predictions_json(json_file)
            df = convert_json_to_dataframe(json_data, modality, participant_id, session_id)
            if len(df) > 0:
                dataframes.append(df)
                log.info(f"Loaded {len(df)} rows from {json_file}")
        except Exception as e:
            log.error(f"Error loading {json_file}: {e}")
            # Continue with other files
            continue
    
    return dataframes


@task(name="validate-dataframes")
def validate_dataframes(dataframes: List[Any], modality: str) -> List[Any]:
    """
    Validate DataFrames using Pandera schema
    
    Args:
        dataframes: List of DataFrames to validate
        modality: One of 'burst', 'language', 'prosody', 'face'
    
    Returns:
        List of validated DataFrames
    """
    log = get_run_logger()
    
    validated_dfs = []
    for df in dataframes:
        result = validate_with_pandera(df, modality)
        if result.is_valid:
            validated_dfs.append(result.validated_df)
            log.info(f"Validated DataFrame with {len(result.validated_df)} rows")
        else:
            log.error(f"Validation failed: {result.errors}")
            raise ValueError(f"Validation failed: {result.errors}")
    
    return validated_dfs


@task(name="save-parquet-files")
def save_parquet_files(
    dataframes: List[Any],
    participant_id: str,
    session_id: str,
    modality: str
) -> List[Path]:
    """
    Save validated DataFrames to Parquet files
    
    Args:
        dataframes: List of validated DataFrames
        participant_id: Participant ID
        session_id: Session ID
        modality: One of 'burst', 'language', 'prosody', 'face'
    
    Returns:
        List of Parquet file paths
    """
    log = get_run_logger()
    
    parquet_paths = []
    for i, df in enumerate(dataframes):
        # If multiple dataframes, append index to modality name
        modality_name = f"{modality}_{i}" if len(dataframes) > 1 else modality
        parquet_path = save_to_parquet(df, participant_id, session_id, modality_name)
        parquet_paths.append(parquet_path)
        log.info(f"Saved {len(df)} rows to {parquet_path}")
    
    return parquet_paths


@task(name="import-to-database")
async def import_to_database(
    parquet_paths: List[Path],
    session_id: str,
    participant_id: str,
    modality: str
) -> Tuple[int, int]:
    """
    Import Parquet files to PostgreSQL database
    
    Args:
        parquet_paths: List of Parquet file paths
        session_id: Session ID
        participant_id: Participant ID
        modality: One of 'burst', 'language', 'prosody', 'face'
    
    Returns:
        Tuple of (total_entries, total_emotions)
    """
    log = get_run_logger()
    
    total_entries = 0
    total_emotions = 0
    
    for parquet_path in parquet_paths:
        try:
            entries, emotions = await import_parquet_to_db(
                parquet_path, session_id, participant_id, modality
            )
            total_entries += entries
            total_emotions += emotions
            log.info(f"Imported {entries} entries, {emotions} emotions from {parquet_path}")
        except Exception as e:
            log.error(f"Error importing {parquet_path}: {e}")
            raise
    
    return total_entries, total_emotions


@flow(name="process-emotions")
async def process_emotions_workflow(participant_id: str) -> Dict[str, Any]:
    """
    Main workflow for processing emotion data for a participant
    
    Args:
        participant_id: Participant ID
    
    Returns:
        Dict with processing results
    """
    log = get_run_logger()
    
    dataset_path = Path(os.getenv("DATASET_PATH", "/app/dataset/participants"))
    participant_path = dataset_path / participant_id
    
    if not participant_path.exists():
        raise FileNotFoundError(f"Participant directory not found: {participant_path}")
    
    # Get database connection to fetch sessions
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Check if participant exists
        participant_exists = await conn.fetchval(
            "SELECT id FROM participants WHERE id::text = $1",
            participant_id
        )
        
        if not participant_exists:
            raise ValueError(f"Participant {participant_id} not found. Import participants first.")
        
        # Get all sessions for this participant
        session_rows = await conn.fetch(
            "SELECT id, session_index FROM sessions WHERE participant_id::text = $1 ORDER BY session_index",
            participant_id
        )
        
        if not session_rows:
            raise ValueError(f"No sessions found for participant {participant_id}. Import sessions first.")
        
        # Create mapping from session_index to session_id
        session_map = {row['session_index']: str(row['id']) for row in session_rows}
    
    # Detect emotion files
    files = detect_emotion_files(participant_id, participant_path)
    
    results = {
        'participant_id': participant_id,
        'total_entries': 0,
        'total_emotions': 0,
        'modalities_processed': [],
    }
    
    # Process each modality
    modalities = ['burst', 'language', 'prosody', 'face']
    
    for modality in modalities:
        csv_key = f'csv_{modality}'
        csv_files = files.get(csv_key, [])
        
        if not csv_files:
            log.info(f"No {modality} CSV files found for participant {participant_id}")
            continue
        
        # Group CSV files by session_index
        csv_by_session = {}
        for csv_file in csv_files:
            # Extract session_index from parent directory path
            # Path format: .../registry_file-X-.../csv/.../modality.csv
            registry_dir = csv_file.parent.parent.parent
            session_index = extract_session_index_from_registry_dir(registry_dir.name)
            
            if session_index is None or session_index not in session_map:
                log.warning(f"Could not determine session for {csv_file}, skipping")
                continue
            
            session_id = session_map[session_index]
            if session_id not in csv_by_session:
                csv_by_session[session_id] = []
            csv_by_session[session_id].append(csv_file)
        
        # Process each session
        for session_id, session_csv_files in csv_by_session.items():
            # Load CSV data
            dataframes = load_csv_data(session_csv_files, modality)
            
            if not dataframes:
                continue
            
            # Combine dataframes if multiple
            combined_df = pd.concat(dataframes, ignore_index=True) if len(dataframes) > 1 else dataframes[0]
            
            # Validate
            validated_dfs = validate_dataframes([combined_df], modality)
            
            if not validated_dfs:
                continue
            
            # Save to Parquet
            parquet_paths = save_parquet_files(validated_dfs, participant_id, session_id, modality)
            
            # Import to database
            entries, emotions = await import_to_database(parquet_paths, session_id, participant_id, modality)
            
            results['total_entries'] += entries
            results['total_emotions'] += emotions
            results['modalities_processed'].append(modality)
    
    # Process JSON files if any
    json_files = files.get('json', [])
    if json_files:
        # JSON files are typically associated with a single session (registry_file-0)
        # For now, we'll process them with the first session
        if session_map:
            first_session_id = list(session_map.values())[0]
            for modality in modalities:
                json_dfs = load_json_data(json_files, modality, participant_id, first_session_id)
                if json_dfs:
                    combined_json_df = pd.concat(json_dfs, ignore_index=True) if len(json_dfs) > 1 else json_dfs[0]
                    validated_json_dfs = validate_dataframes([combined_json_df], modality)
                    if validated_json_dfs:
                        json_parquet_paths = save_parquet_files(validated_json_dfs, participant_id, first_session_id, modality)
                        json_entries, json_emotions = await import_to_database(json_parquet_paths, first_session_id, participant_id, modality)
                        results['total_entries'] += json_entries
                        results['total_emotions'] += json_emotions
    
    log.info(f"Processed emotion data for participant {participant_id}: {results['total_entries']} entries, {results['total_emotions']} emotions")
    return results

