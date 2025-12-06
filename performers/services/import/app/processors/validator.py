"""
Data validation using Pandera and Pydantic
Merkle DAG: import.service.processors.validator
"""
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import pandas as pd
import pandera as pa
from pandera.errors import SchemaError

from app.schemas import (
    BurstSchema,
    LanguageSchema,
    ProsodySchema,
    FaceSchema,
    BurstEmotionRecord,
    LanguageEmotionRecord,
    ProsodyEmotionRecord,
    FaceEmotionRecord,
)

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Result of data validation"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    validated_df: Optional[pd.DataFrame] = None
    failed_rows: Optional[pd.DataFrame] = None


def validate_with_pandera(
    df: pd.DataFrame,
    modality: str,
    schema: Optional[pa.DataFrameSchema] = None
) -> ValidationResult:
    """
    Validate DataFrame using Pandera schema
    
    Args:
        df: DataFrame to validate
        modality: One of 'burst', 'language', 'prosody', 'face'
        schema: Optional schema (if None, uses default for modality)
    
    Returns:
        ValidationResult
    """
    errors = []
    warnings = []
    
    # Get schema if not provided
    if schema is None:
        schema_map = {
            'burst': BurstSchema,
            'language': LanguageSchema,
            'prosody': ProsodySchema,
            'face': FaceSchema,
        }
        if modality not in schema_map:
            return ValidationResult(
                is_valid=False,
                errors=[f"Unknown modality: {modality}"],
                warnings=[],
            )
        schema = schema_map[modality]
    
    try:
        # Validate with Pandera
        validated_df = schema.validate(df, lazy=True)
        
        return ValidationResult(
            is_valid=True,
            errors=[],
            warnings=[],
            validated_df=validated_df,
        )
    
    except SchemaError as e:
        # Extract validation errors
        error_messages = []
        if hasattr(e, 'error_counts'):
            for error_type, count in e.error_counts.items():
                error_messages.append(f"{error_type}: {count} errors")
        
        if hasattr(e, 'schema_errors'):
            for schema_error in e.schema_errors:
                error_messages.append(str(schema_error))
        
        # Try to get failed rows
        failed_rows = None
        try:
            # Pandera provides failure cases
            if hasattr(e, 'failure_cases'):
                failed_rows = e.failure_cases
        except Exception:
            pass
        
        return ValidationResult(
            is_valid=False,
            errors=error_messages if error_messages else [str(e)],
            warnings=[],
            failed_rows=failed_rows,
        )
    
    except Exception as e:
        logger.error(f"Unexpected error during validation: {e}", exc_info=True)
        return ValidationResult(
            is_valid=False,
            errors=[f"Unexpected validation error: {str(e)}"],
            warnings=[],
        )


def validate_with_pydantic(
    df: pd.DataFrame,
    modality: str,
    sample_size: Optional[int] = None
) -> ValidationResult:
    """
    Validate DataFrame using Pydantic models (sample validation)
    
    Args:
        df: DataFrame to validate
        modality: One of 'burst', 'language', 'prosody', 'face'
        sample_size: Number of rows to sample for validation (None = all rows)
    
    Returns:
        ValidationResult
    """
    errors = []
    warnings = []
    
    # Get model class
    model_map = {
        'burst': BurstEmotionRecord,
        'language': LanguageEmotionRecord,
        'prosody': ProsodyEmotionRecord,
        'face': FaceEmotionRecord,
    }
    
    if modality not in model_map:
        return ValidationResult(
            is_valid=False,
            errors=[f"Unknown modality: {modality}"],
            warnings=[],
        )
    
    model_class = model_map[modality]
    
    # Sample rows if requested
    if sample_size and len(df) > sample_size:
        df_to_validate = df.sample(n=sample_size, random_state=42)
        warnings.append(f"Validating sample of {sample_size} rows out of {len(df)} total")
    else:
        df_to_validate = df
    
    # Validate each row
    failed_rows = []
    for idx, row in df_to_validate.iterrows():
        try:
            # Convert row to dict and create model instance
            row_dict = row.to_dict()
            model_class(**row_dict)
        except Exception as e:
            failed_rows.append({
                'index': idx,
                'error': str(e),
                'row': row_dict,
            })
            errors.append(f"Row {idx}: {str(e)}")
    
    is_valid = len(failed_rows) == 0
    
    if not is_valid:
        failed_df = pd.DataFrame(failed_rows)
    else:
        failed_df = None
    
    return ValidationResult(
        is_valid=is_valid,
        errors=errors,
        warnings=warnings,
        failed_rows=failed_df,
    )

