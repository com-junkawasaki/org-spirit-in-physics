"""
Burst emotion data schema definitions
Merkle DAG: import.service.schemas.burst
"""
import pandera as pa
from pandera.typing import DataFrame
from pydantic import BaseModel, Field
from typing import Dict, Optional
import pandas as pd

# Valid emotion names from actual CSV files (115 emotions for burst)
BURST_EMOTION_NAMES = [
    'Admiration', 'Adoration', 'Aesthetic Appreciation', 'Ah', 'Aha', 'Ahh',
    'Amusement', 'Anger', 'Anxiety', 'Argh', 'Awe', 'Awkwardness', 'Aww',
    'Boredom', 'Cackle', 'Calmness', 'Cheer', 'Chuckle', 'Concentration',
    'Confusion', 'Contemplation', 'Contempt', 'Contentment', 'Craving', 'Cry',
    'Desire', 'Determination', 'Disappointment', 'Disgust', 'Distress', 'Doubt',
    'Ecstasy', 'Eek', 'Embarrassment', 'Empathic Pain', 'Entrancement', 'Envy',
    'Eww', 'Excitement', 'Fear', 'Gasp', 'Giggle', 'Groan', 'Growl', 'Grr',
    'Grunt', 'Guilt', 'Ha', 'Hah', 'Haha', 'Hehe', 'Hiss', 'Hmm', 'Hoot',
    'Horror', 'Howl', 'Huh', 'Hurray', 'Interest', 'Joy', 'Laugh', 'Love',
    'Mhm', 'Mmm', 'Moan', 'Nostalgia', 'Oh', 'Ohh', 'Ooh', 'Ooph', 'Ouch',
    'Oww', 'Pain', 'Pant', 'Pff', 'Phew', 'Pride', 'Realization', 'Relief',
    'Roar', 'Romance', 'Sadness', 'Satisfaction', 'Scream', 'Screech', 'Shame',
    'Shout', 'Shriek', 'Sigh', 'Snicker', 'Snort', 'Sob', 'Squeal',
    'Surprise (negative)', 'Surprise (positive)', 'Sympathy', 'Tiredness',
    'Triumph', 'Tsk', 'Ugh', 'Uh', 'Uh-huh', 'Umm', 'Wail', 'Whee', 'Wheep',
    'Whew', 'Whimper', 'Woah', 'Wow', 'Yawn', 'Yay', 'Yelp', 'Yippee', 'Yuck',
]


def create_burst_schema() -> pa.DataFrameSchema:
    """Create Pandera schema for burst emotion data"""
    # Base columns
    columns = {
        "Id": pa.Column(str, nullable=True),
        "BeginTime": pa.Column(float, checks=pa.Check.ge(0), nullable=False),
        "EndTime": pa.Column(float, checks=pa.Check.ge(0), nullable=False),
    }
    
    # Add emotion columns from actual CSV files
    for emotion_name in BURST_EMOTION_NAMES:
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
            if key not in excluded_fields and key in BURST_EMOTION_NAMES:
                try:
                    score = float(value)
                    if score > 0:
                        emotion_scores[key] = score
                except (ValueError, TypeError):
                    pass
        
        # Set emotions dict
        data["emotions"] = emotion_scores
        
        super().__init__(**data)
