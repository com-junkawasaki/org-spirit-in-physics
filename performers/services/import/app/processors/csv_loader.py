"""
CSV loader with explicit dtype definitions
Merkle DAG: import.service.processors.csv_loader
"""
import logging
from pathlib import Path
from typing import Optional, Dict, Any
import pandas as pd
import polars as pl

from app.schemas.burst import VALID_EMOTION_NAMES

logger = logging.getLogger(__name__)


def load_csv_with_dtypes(
    csv_path: Path,
    modality: str,
    use_polars: bool = False,
    dtype_overrides: Optional[Dict[str, Any]] = None
) -> pd.DataFrame | pl.DataFrame:
    """
    Load CSV file with explicit dtype definitions
    
    Args:
        csv_path: Path to CSV file
        modality: One of 'burst', 'language', 'prosody', 'face'
        use_polars: If True, use Polars instead of pandas
        dtype_overrides: Optional dict of column name -> dtype overrides
    
    Returns:
        DataFrame (pandas or polars)
    """
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")
    
    # Define base dtypes for each modality
    base_dtypes = {
        "Id": str,
        "BeginTime": "float64",
        "EndTime": "float64",
    }
    
    if modality == "language":
        base_dtypes["text"] = str
        base_dtypes["Text"] = str
        base_dtypes["Confidence"] = "float64"
    elif modality == "prosody":
        base_dtypes["Confidence"] = "float64"
    elif modality == "face":
        base_dtypes["FrameNumber"] = "Int64"  # Nullable integer
        base_dtypes["Confidence"] = "float64"
        base_dtypes["probability"] = "float64"
        base_dtypes["prob"] = "float64"
    
    # Add emotion columns as float64
    emotion_dtypes = {emotion: "float64" for emotion in VALID_EMOTION_NAMES}
    base_dtypes.update(emotion_dtypes)
    
    # Apply overrides
    if dtype_overrides:
        base_dtypes.update(dtype_overrides)
    
    try:
        if use_polars:
            # Polars loading
            df = pl.read_csv(
                csv_path,
                infer_schema_length=0,  # Read all rows to infer schema
                try_parse_dates=False,
            )
            # Convert dtypes (Polars uses different syntax)
            # Note: Polars doesn't support dtype dict like pandas, so we'll cast after reading
            return df
        else:
            # Pandas loading
            df = pd.read_csv(
                csv_path,
                dtype=base_dtypes,
                na_values=["", "nan", "None"],
                keep_default_na=True,
            )
            return df
    except Exception as e:
        logger.error(f"Error loading CSV {csv_path}: {e}")
        raise


def load_burst_csv(csv_path: Path, use_polars: bool = False) -> pd.DataFrame | pl.DataFrame:
    """Load burst CSV file"""
    return load_csv_with_dtypes(csv_path, "burst", use_polars)


def load_language_csv(csv_path: Path, use_polars: bool = False) -> pd.DataFrame | pl.DataFrame:
    """Load language CSV file"""
    return load_csv_with_dtypes(csv_path, "language", use_polars)


def load_prosody_csv(csv_path: Path, use_polars: bool = False) -> pd.DataFrame | pl.DataFrame:
    """Load prosody CSV file"""
    return load_csv_with_dtypes(csv_path, "prosody", use_polars)


def load_face_csv(csv_path: Path, use_polars: bool = False) -> pd.DataFrame | pl.DataFrame:
    """Load face CSV file"""
    return load_csv_with_dtypes(csv_path, "face", use_polars)

