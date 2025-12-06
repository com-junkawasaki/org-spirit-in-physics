"""
Burst emotion data schema definitions
Merkle DAG: import.service.schemas.burst
"""
import pandera as pa
from pandera.typing import DataFrame
from pydantic import BaseModel, Field
from typing import Dict, Optional
import pandas as pd

# Valid emotion names from emotion_name_enum (82 types)
VALID_EMOTION_NAMES = [
    # Basic emotions
    'Admiration', 'Adoration', 'Aesthetic Appreciation', 'Amusement', 'Anger',
    'Anxiety', 'Awe', 'Awkwardness', 'Boredom', 'Calmness',
    'Concentration', 'Contemplation', 'Confusion', 'Contempt', 'Contentment',
    'Craving', 'Determination', 'Disappointment', 'Disgust', 'Distress',
    'Doubt', 'Ecstasy', 'Embarrassment', 'Empathic Pain', 'Entrancement',
    'Envy', 'Excitement', 'Fear', 'Guilt', 'Horror',
    'Interest', 'Joy', 'Love', 'Nostalgia', 'Pain',
    'Pride', 'Realization', 'Relief', 'Romance', 'Sadness',
    'Satisfaction', 'Desire', 'Shame', 'Surprise (negative)', 'Surprise (positive)',
    'Surprise', 'Sympathy', 'Tiredness', 'Triumph',
    # Vocal expressions (burst emotions)
    'Cackle', 'Cheer', 'Chuckle', 'Cry', 'Gasp',
    'Giggle', 'Groan', 'Growl', 'Grunt', 'Hiss',
    'Hoot', 'Howl', 'Laugh', 'Moan', 'Pant',
    'Roar', 'Scream', 'Screech', 'Shout', 'Shriek',
    'Sigh', 'Snicker', 'Snort', 'Sob', 'Squeal',
    'Wail', 'Wheep', 'Whee', 'Whew', 'Yawn',
    'Yelp', 'Yuck',
    # Neutral/Metadata
    'Neutral',
    # Additional vocal expressions from CSV
    'Ah', 'Aha', 'Ahh', 'Argh', 'Aww',
    'Eek', 'Eww', 'Grr', 'Ha', 'Hah',
    'Haha', 'Hehe', 'Hmm', 'Huh', 'Hurray',
    'Mhm', 'Mmm', 'Oh', 'Ohh', 'Ooh',
    'Ooph', 'Ouch', 'Oww', 'Pff', 'Phew',
    'Tsk', 'Ugh', 'Uh', 'Uh-huh', 'Umm',
    'Woah', 'Wow', 'Yay', 'Yippee'
]


def create_burst_schema() -> pa.DataFrameSchema:
    """Create Pandera schema for burst emotion data"""
    # Base columns
    columns = {
        "Id": pa.Column(str, nullable=True),
        "BeginTime": pa.Column(float, checks=pa.Check.ge(0), nullable=False),
        "EndTime": pa.Column(float, checks=pa.Check.ge(0), nullable=False),
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
BurstSchema = create_burst_schema()


# Pydantic model for individual records
class BurstEmotionRecord(BaseModel):
    """Pydantic model for a single burst emotion record"""
    id: str = Field(alias="Id", default="unknown")
    begin_time: float = Field(alias="BeginTime", ge=0)
    end_time: float = Field(alias="EndTime", ge=0)
    emotions: Dict[str, float] = Field(default_factory=dict)
    
    class Config:
        populate_by_name = True
        extra = "allow"  # Allow additional emotion fields
    
    def __init__(self, **data):
        # Extract emotion scores from data
        emotion_scores = {}
        excluded_fields = {"Id", "BeginTime", "EndTime", "BeginPosition", "EndPosition", "FrameNumber", "Time", "Confidence"}
        
        for key, value in data.items():
            if key not in excluded_fields and key in VALID_EMOTION_NAMES:
                try:
                    score = float(value)
                    if score > 0:
                        emotion_scores[key] = score
                except (ValueError, TypeError):
                    pass
        
        # Set emotions dict
        data["emotions"] = emotion_scores
        
        super().__init__(**data)

