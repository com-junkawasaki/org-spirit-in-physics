"""
Parquet writer with versioned paths
Merkle DAG: import.service.processors.parquet_writer
"""
import logging
from pathlib import Path
from typing import Optional, Dict, Any
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

logger = logging.getLogger(__name__)

# Version for parquet files
PARQUET_VERSION = "v1"


def get_parquet_path(
    participant_id: str,
    session_id: str,
    modality: str,
    base_path: Optional[Path] = None,
    version: str = PARQUET_VERSION
) -> Path:
    """
    Generate parquet file path with versioning
    
    Args:
        participant_id: Participant ID
        session_id: Session ID
        modality: One of 'burst', 'language', 'prosody', 'face'
        base_path: Base directory for processed data (default: ./processed)
        version: Version string (default: v1)
    
    Returns:
        Path to parquet file
    """
    if base_path is None:
        base_path = Path(__file__).parent.parent.parent / "processed"
    
    parquet_path = base_path / version / participant_id / session_id / f"{modality}.parquet"
    return parquet_path


def save_to_parquet(
    df: pd.DataFrame,
    participant_id: str,
    session_id: str,
    modality: str,
    base_path: Optional[Path] = None,
    version: str = PARQUET_VERSION,
    metadata: Optional[Dict[str, Any]] = None
) -> Path:
    """
    Save validated DataFrame to Parquet file with versioned path
    
    Args:
        df: DataFrame to save
        participant_id: Participant ID
        session_id: Session ID
        modality: One of 'burst', 'language', 'prosody', 'face'
        base_path: Base directory for processed data (default: ./processed)
        version: Version string (default: v1)
        metadata: Optional metadata dict to include in Parquet file
    
    Returns:
        Path to saved parquet file
    """
    parquet_path = get_parquet_path(participant_id, session_id, modality, base_path, version)
    
    # Create directory if it doesn't exist
    parquet_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Prepare metadata
    parquet_metadata = {
        'version': version,
        'participant_id': participant_id,
        'session_id': session_id,
        'modality': modality,
        'row_count': len(df),
    }
    
    if metadata:
        parquet_metadata.update(metadata)
    
    try:
        # Convert DataFrame to PyArrow Table
        table = pa.Table.from_pandas(df)
        
        # Add metadata to schema
        schema = table.schema
        metadata_dict = {}
        for key, value in parquet_metadata.items():
            metadata_dict[key.encode('utf-8')] = str(value).encode('utf-8')
        
        schema = schema.with_metadata(metadata_dict)
        table = table.cast(schema)
        
        # Write to Parquet
        pq.write_table(
            table,
            parquet_path,
            compression='snappy',
            write_statistics=True,
            use_dictionary=True,
        )
        
        logger.info(f"Saved {len(df)} rows to {parquet_path}")
        return parquet_path
    
    except Exception as e:
        logger.error(f"Error saving parquet file {parquet_path}: {e}", exc_info=True)
        raise

