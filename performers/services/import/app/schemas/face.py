"""
Face emotion data schema definitions
Merkle DAG: import.service.schemas.face
"""
import pandera as pa
from pandera.typing import DataFrame
from pydantic import BaseModel, Field
from typing import Dict, Optional

# Valid emotion names from actual CSV files (80 emotions for face)
FACE_EMOTION_NAMES = [
    'Admiration', 'Adoration', 'Aesthetic Appreciation', 'Amusement', 'Anger',
    'Anxiety', 'Awe', 'Awkwardness', 'Beaming', 'Biting lip', 'Boredom',
    'Calmness', 'Cheering', 'Concentration', 'Confusion', 'Contemplation',
    'Contempt', 'Contentment', 'Craving', 'Cringe', 'Cry', 'Desire',
    'Determination', 'Disappointment', 'Disgust', 'Distress', 'Doubt', 'Ecstasy',
    'Embarrassment', 'Empathic Pain', 'Entrancement', 'Envy', 'Excitement',
    'Eyes closed', 'Face in hands', 'Fear', 'Frown', 'Gasp', 'Glare', 'Glaring',
    'Grimace', 'Grin', 'Guilt', 'Hand over Eyes', 'Hand over Face',
    'Hand over Forehead', 'Hand over Mouth', 'Hand touching Face / Head',
    'Horror', 'Interest', 'Jaw drop', 'Joy', 'Laugh', 'Licking lip', 'Love',
    'Nostalgia', 'Pain', 'Pout', 'Pride', 'Realization', 'Relief', 'Romance',
    'Sadness', 'Satisfaction', 'Scowl', 'Shame', 'Smile', 'Smirk', 'Snarl',
    'Squint', 'Sulking', 'Surprise (negative)', 'Surprise (positive)',
    'Sympathy', 'Tiredness', 'Tongue out', 'Triumph', 'Wide-eyed', 'Wince',
    'Wrinkled nose',
]


def create_face_schema() -> pa.DataFrameSchema:
    """Create Pandera schema for face emotion data"""
    # Base columns
    columns = {
        "Id": pa.Column(str, nullable=True),
        "BeginTime": pa.Column(float, checks=pa.Check.ge(0), nullable=False),
        "FrameNumber": pa.Column(int, nullable=True, required=False),
        "Confidence": pa.Column(float, checks=pa.Check.ge(0) & pa.Check.le(1), nullable=True, required=False),
        "probability": pa.Column(float, checks=pa.Check.ge(0) & pa.Check.le(1), nullable=True, required=False),
        "prob": pa.Column(float, checks=pa.Check.ge(0) & pa.Check.le(1), nullable=True, required=False),
    }
    
    # Add emotion columns from actual CSV files
    for emotion_name in FACE_EMOTION_NAMES:
        columns[emotion_name] = pa.Column(
            float,
            checks=pa.Check.ge(0) & pa.Check.le(1),
            nullable=True,
            required=False
        )
    
    return pa.DataFrameSchema(
        columns=columns,
        strict=False,  # Allow additional columns (AU columns, etc.)
        coerce=True,   # Coerce types
    )


# Create the schema instance
FaceSchema = create_face_schema()


# Pydantic model for individual records
class FaceEmotionRecord(BaseModel):
    """Pydantic model for a single face emotion record"""
    id: str = Field(alias="Id", default="unknown")
    begin_time: float = Field(alias="BeginTime", ge=0)
    frame_number: Optional[int] = Field(alias="FrameNumber", default=None)
    confidence: Optional[float] = Field(default=None, ge=0, le=1)
    probability: Optional[float] = Field(default=None, ge=0, le=1)
    emotions: Dict[str, float] = Field(default_factory=dict)
    
    class Config:
        populate_by_name = True
        extra = "allow"  # Allow additional emotion fields (AU columns, etc.)
    
    def __init__(self, **data):
        # Extract emotion scores from data
        emotion_scores = {}
        excluded_fields = {"Id", "BeginTime", "EndTime", "BeginPosition", "EndPosition", "FrameNumber", "Time", "Confidence", "probability", "prob"}
        
        for key, value in data.items():
            if key not in excluded_fields and key in FACE_EMOTION_NAMES:
                try:
                    score = float(value)
                    if score > 0:
                        emotion_scores[key] = score
                except (ValueError, TypeError):
                    pass
        
        # Handle probability/prob fields
        if "prob" in data:
            data["probability"] = data.get("prob")
        
        # Set emotions dict
        data["emotions"] = emotion_scores
        
        super().__init__(**data)
