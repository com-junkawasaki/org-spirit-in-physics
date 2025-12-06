"""
JSON loader for HumeAI predictions
Merkle DAG: import.service.processors.json_loader
"""
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import pandas as pd

from app.schemas.burst import BURST_EMOTION_NAMES
from app.schemas.language import LANGUAGE_EMOTION_NAMES
from app.schemas.prosody import PROSODY_EMOTION_NAMES
from app.schemas.face import FACE_EMOTION_NAMES

logger = logging.getLogger(__name__)


def load_predictions_json(json_path: Path) -> Dict[str, Any]:
    """
    Load HumeAI predictions JSON file
    
    Args:
        json_path: Path to JSON file
    
    Returns:
        Parsed JSON data as dict
    """
    if not json_path.exists():
        raise FileNotFoundError(f"JSON file not found: {json_path}")
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # JSON structure: list[dict] where dict has 'results' key
    if not isinstance(data, list) or len(data) == 0:
        raise ValueError(f"Invalid JSON structure in {json_path}: expected non-empty list")
    
    first_item = data[0]
    if 'results' not in first_item or not isinstance(first_item['results'], dict):
        raise ValueError(f"No 'results' key found in {json_path}")
    
    return first_item['results']


def convert_json_to_dataframe(
    json_data: Dict[str, Any],
    model_type: str,
    participant_id: str,
    session_id: str
) -> pd.DataFrame:
    """
    Convert JSON predictions to DataFrame
    
    Args:
        json_data: Parsed JSON data from load_predictions_json
        model_type: One of 'burst', 'language', 'prosody', 'face'
        participant_id: Participant ID
        session_id: Session ID
    
    Returns:
        DataFrame with columns matching CSV format
    """
    if 'predictions' not in json_data or not isinstance(json_data['predictions'], list):
        raise ValueError("No 'predictions' key found in JSON data")
    
    predictions = json_data['predictions']
    if len(predictions) == 0:
        logger.warning(f"Empty predictions list for {model_type}")
        return pd.DataFrame()
    
    records = []
    
    # Process each prediction entry
    for prediction in predictions:
        if 'models' not in prediction or not isinstance(prediction['models'], dict):
            continue
        
        models = prediction['models']
        if model_type not in models:
            continue
        
        model_data = models[model_type]
        if 'grouped_predictions' not in model_data or not isinstance(model_data['grouped_predictions'], list):
            continue
        
        grouped_predictions = model_data['grouped_predictions']
        
        for grouped in grouped_predictions:
            if 'predictions' not in grouped or not isinstance(grouped['predictions'], list):
                continue
            
            record_id = grouped.get('id', 'unknown')
            
            for pred in grouped['predictions']:
                # Extract time information
                time_info = pred.get('time', {})
                begin_time = float(time_info.get('begin', 0))
                end_time = float(time_info.get('end', begin_time + 1.0))
                
                # Extract emotions
                emotions = pred.get('emotions', [])
                emotion_scores = {}
                for emotion in emotions:
                    if isinstance(emotion, dict):
                        name = emotion.get('name', '')
                        score = float(emotion.get('score', 0))
                        if name and score > 0:
                            emotion_scores[name] = score
                
                # Build record based on model type
                record = {
                    'Id': record_id,
                    'BeginTime': begin_time,
                    'EndTime': end_time,
                }
                
                # Add emotion scores
                for emotion_name, score in emotion_scores.items():
                    record[emotion_name] = score
                
                # Add modality-specific fields
                if model_type == 'burst':
                    descriptions = pred.get('descriptions', [])
                    # Vocal types are stored as metadata, not in the main record
                    # They'll be handled separately in the import process
                
                elif model_type == 'language':
                    text = pred.get('text', '')
                    if text:
                        record['text'] = text
                        record['Text'] = text
                    confidence = pred.get('confidence')
                    if confidence is not None:
                        record['Confidence'] = float(confidence)
                
                elif model_type == 'prosody':
                    confidence = pred.get('confidence')
                    if confidence is not None:
                        record['Confidence'] = float(confidence)
                
                elif model_type == 'face':
                    box = pred.get('box', {})
                    frame = pred.get('frame')
                    prob = pred.get('prob')
                    if frame is not None:
                        record['FrameNumber'] = int(frame)
                    if prob is not None:
                        record['probability'] = float(prob)
                        record['prob'] = float(prob)
                    if box:
                        # Box coordinates are stored as metadata
                        pass
                
                records.append(record)
    
    if not records:
        return pd.DataFrame()
    
    # Convert to DataFrame
    df = pd.DataFrame(records)
    
    # Ensure all emotion columns are present (fill with NaN if missing)
    emotion_name_map = {
        "burst": BURST_EMOTION_NAMES,
        "language": LANGUAGE_EMOTION_NAMES,
        "prosody": PROSODY_EMOTION_NAMES,
        "face": FACE_EMOTION_NAMES,
    }
    emotion_names = emotion_name_map.get(model_type, [])
    for emotion_name in emotion_names:
        if emotion_name not in df.columns:
            df[emotion_name] = None
    
    return df

