"""
Language emotion data schema definitions
Merkle DAG: import.service.schemas.language
"""
import pandera as pa
from pandera.typing import DataFrame
from pydantic import BaseModel, Field
from typing import Dict, Optional
from .burst import VALID_EMOTION_NAMES


def create_language_schema() -> pa.DataFrameSchema:
    """Create Pandera schema for language emotion data"""
    # Base columns
    columns = {
        "Id": pa.Column(str, nullable=True),
        "BeginTime": pa.Column(float, checks=pa.Check.ge(0), nullable=False),
        "EndTime": pa.Column(float, checks=pa.Check.ge(0), nullable=False),
        "text": pa.Column(str, nullable=True, required=False),
        "Text": pa.Column(str, nullable=True, required=False),  # Alternative column name
        "Confidence": pa.Column(float, checks=pa.Check.ge(0) & pa.Check.le(1), nullable=True, required=False),
    }
    
    # Add emotion columns dynamically
    for emotion_name in VALID_EMOTION_NAMES:
        columns[emotion_name] = pa.Column(
            float,
            checks=pa.Check.ge(0) & pa.Check.le(1),
            nullable=True,
            required=False
        )
    
    return pa.DataFrameSchema(
        columns=columns,
        strict=False,  # Allow additional columns
        coerce=True,   # Coerce types
    )


# Create the schema instance
LanguageSchema = create_language_schema()


# Pydantic model for individual records
class LanguageEmotionRecord(BaseModel):
    """Pydantic model for a single language emotion record"""
    id: str = Field(alias="Id", default="unknown")
    begin_time: float = Field(alias="BeginTime", ge=0)
    end_time: float = Field(alias="EndTime", ge=0)
    text: Optional[str] = Field(default=None)
    confidence: Optional[float] = Field(alias="Confidence", default=None, ge=0, le=1)
    emotions: Dict[str, float] = Field(default_factory=dict)
    
    class Config:
        populate_by_name = True
        extra = "allow"  # Allow additional emotion fields
    
    def __init__(self, **data):
        # Extract emotion scores from data
        emotion_scores = {}
        excluded_fields = {"Id", "BeginTime", "EndTime", "BeginPosition", "EndPosition", "FrameNumber", "Time", "Confidence", "text", "Text"}
        
        for key, value in data.items():
            if key not in excluded_fields and key in VALID_EMOTION_NAMES:
                try:
                    score = float(value)
                    if score > 0:
                        emotion_scores[key] = score
                except (ValueError, TypeError):
                    pass
        
        # Handle text field (can be "text" or "Text")
        if "Text" in data and data["Text"]:
            data["text"] = data.get("Text")
        
        # Set emotions dict
        data["emotions"] = emotion_scores
        
        super().__init__(**data)

