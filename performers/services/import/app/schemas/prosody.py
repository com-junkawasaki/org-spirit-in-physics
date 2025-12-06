"""
Prosody emotion data schema definitions
Merkle DAG: import.service.schemas.prosody
"""
import pandera as pa
from pandera.typing import DataFrame
from pydantic import BaseModel, Field
from typing import Dict, Optional

# Valid emotion names from actual CSV files (48 emotions for prosody)
PROSODY_EMOTION_NAMES = [
    'Admiration', 'Adoration', 'Aesthetic Appreciation', 'Amusement', 'Anger',
    'Anxiety', 'Awe', 'Awkwardness', 'Boredom', 'Calmness', 'Concentration',
    'Confusion', 'Contemplation', 'Contempt', 'Contentment', 'Craving', 'Desire',
    'Determination', 'Disappointment', 'Disgust', 'Distress', 'Doubt', 'Ecstasy',
    'Embarrassment', 'Empathic Pain', 'Entrancement', 'Envy', 'Excitement',
    'Fear', 'Guilt', 'Horror', 'Interest', 'Joy', 'Love', 'Nostalgia', 'Pain',
    'Pride', 'Realization', 'Relief', 'Romance', 'Sadness', 'Satisfaction',
    'Shame', 'Surprise (negative)', 'Surprise (positive)', 'Sympathy',
    'Tiredness', 'Triumph',
]


def create_prosody_schema() -> pa.DataFrameSchema:
    """Create Pandera schema for prosody emotion data"""
    # Base columns
    columns = {
        "Id": pa.Column(str, nullable=True),
        "BeginTime": pa.Column(float, checks=pa.Check.ge(0), nullable=False),
        "EndTime": pa.Column(float, checks=pa.Check.ge(0), nullable=True, required=False),
        "Confidence": pa.Column(float, checks=[pa.Check.ge(0), pa.Check.le(1)], nullable=True, required=False),
    }
    
    # Add emotion columns from actual CSV files
    for emotion_name in PROSODY_EMOTION_NAMES:
        columns[emotion_name] = pa.Column(
            float,
            checks=[pa.Check.ge(0), pa.Check.le(1)],
            nullable=True,
            required=False
        )
    
    return pa.DataFrameSchema(
        columns=columns,
        strict=False,  # Allow additional columns
        coerce=True,   # Coerce types
    )


# Create the schema instance
ProsodySchema = create_prosody_schema()


# Pydantic model for individual records
class ProsodyEmotionRecord(BaseModel):
    """Pydantic model for a single prosody emotion record"""
    id: str = Field(alias="Id", default="unknown")
    begin_time: float = Field(alias="BeginTime", ge=0)
    end_time: Optional[float] = Field(alias="EndTime", default=None, ge=0)
    confidence: Optional[float] = Field(alias="Confidence", default=None, ge=0, le=1)
    emotions: Dict[str, float] = Field(default_factory=dict)
    
    class Config:
        populate_by_name = True
        extra = "allow"  # Allow additional emotion fields
    
    def __init__(self, **data):
        # Extract emotion scores from data
        emotion_scores = {}
        excluded_fields = {"Id", "BeginTime", "EndTime", "BeginPosition", "EndPosition", "FrameNumber", "Time", "Confidence"}
        
        for key, value in data.items():
            if key not in excluded_fields and key in PROSODY_EMOTION_NAMES:
                try:
                    score = float(value)
                    if score > 0:
                        emotion_scores[key] = score
                except (ValueError, TypeError):
                    pass
        
        # Set emotions dict
        data["emotions"] = emotion_scores
        
        super().__init__(**data)
