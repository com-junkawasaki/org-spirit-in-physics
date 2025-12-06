"""
Emotions import router
Merkle DAG: import.service.import.emotions
"""
import csv
import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.database import get_db_pool

logger = logging.getLogger(__name__)

router = APIRouter()


class EmotionStatistics(BaseModel):
    emotion_entries: int
    csv_files_processed: int
    total_emotions: int


class EmotionResult(BaseModel):
    participant_id: str
    status: str
    message: str
    statistics: Optional[EmotionStatistics] = None


class ImportResult(BaseModel):
    success: bool
    total: int
    processed: int
    results: List[EmotionResult]


@router.post("/emotions", response_model=ImportResult)
async def import_emotions():
    """Import emotions from CSV files"""
    dataset_path = Path(os.getenv("DATASET_PATH", "/app/dataset/participants"))
    
    if not dataset_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset directory not found: {dataset_path}"
        )
    
    participant_dirs = [d for d in dataset_path.iterdir() if d.is_dir()]
    total_count = len(participant_dirs)
    results = []
    
    pool = await get_db_pool()
    
    for participant_dir in participant_dirs:
        participant_id = participant_dir.name
        
        try:
            async with pool.acquire() as conn:
                async with conn.transaction():
                    result = await process_emotions(conn, participant_id, participant_dir)
                    results.append(result)
        except Exception as e:
            logger.error(f"Error importing emotions for participant {participant_id}: {e}")
            results.append(EmotionResult(
                participant_id=participant_id,
                status="error",
                message=str(e),
                statistics=None
            ))
    
    return ImportResult(
        success=True,
        total=total_count,
        processed=len(results),
        results=results
    )


def extract_session_index_from_registry_dir(registry_dir_name: str) -> Optional[int]:
    """Extract session_index from registry_file-X directory name
    
    Args:
        registry_dir_name: Directory name like 'registry_file-0-...' or 'registry_file-1-...'
    
    Returns:
        session_index (int) or None if extraction fails
    """
    try:
        # registry_file-X-... format: extract X
        parts = registry_dir_name.split('-')
        if len(parts) >= 2 and parts[0] == 'registry_file':
            return int(parts[1])
    except (ValueError, IndexError):
        pass
    return None


async def process_emotions(conn, participant_id: str, participant_path: Path):
    """Process emotions for a single participant"""
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
    
    # Create a mapping from session_index to session_id
    session_map = {row['session_index']: str(row['id']) for row in session_rows}
    
    # Find HumeAI artifacts directory
    hume_artifacts_dirs = list(participant_path.glob("HumeAI_artifacts_*"))
    if not hume_artifacts_dirs:
        return EmotionResult(
            participant_id=participant_id,
            status="skipped",
            message="HumeAI artifacts directory not found",
            statistics=None
        )
    
    # Delete existing emotion data for all sessions of this participant
    await conn.execute(
        "DELETE FROM hume_burst_emotion_data WHERE participant_id::text = $1",
        participant_id
    )
    await conn.execute(
        "DELETE FROM hume_face_emotion_data WHERE participant_id::text = $1",
        participant_id
    )
    await conn.execute(
        "DELETE FROM hume_language_emotion_data WHERE participant_id::text = $1",
        participant_id
    )
    await conn.execute(
        "DELETE FROM hume_prosody_emotion_data WHERE participant_id::text = $1",
        participant_id
    )
    
    total_entries = 0
    csv_files_processed = 0
    total_emotions = 0
    sessions_processed = set()
    
    # Process each artifacts directory
    for artifacts_dir in hume_artifacts_dirs:
        # Find registry_file directories
        for registry_dir in artifacts_dir.glob("registry_file-*"):
            # Extract session_index from directory name (e.g., registry_file-0-... -> 0)
            session_index = extract_session_index_from_registry_dir(registry_dir.name)
            
            if session_index is None:
                logger.warning(
                    f"Could not extract session_index from registry directory name: {registry_dir.name}. Skipping."
                )
                continue
            
            # Get corresponding session_id
            if session_index not in session_map:
                logger.warning(
                    f"Session index {session_index} not found in database for participant {participant_id}. "
                    f"Available session indices: {sorted(session_map.keys())}. Skipping registry_file-{session_index}."
                )
                continue
            
            session_id = session_map[session_index]
            sessions_processed.add(session_index)
            
            csv_dir = registry_dir / "csv"
            if not csv_dir.exists():
                logger.debug(f"CSV directory not found: {csv_dir}. Skipping.")
                continue
            
            # Find CSV files in subdirectories
            for csv_subdir in csv_dir.iterdir():
                if not csv_subdir.is_dir():
                    continue
                
                for csv_file in csv_subdir.glob("*.csv"):
                    csv_type = csv_file.name
                    entries, emotions_count = await import_csv_file(
                        conn, session_id, participant_id, csv_file, csv_type
                    )
                    total_entries += entries
                    total_emotions += emotions_count
                    csv_files_processed += 1
                    logger.debug(
                        f"Imported {entries} entries from {csv_file.name} "
                        f"for participant {participant_id}, session_index {session_index}"
                    )
    
    logger.info(
        f"Imported {total_entries} emotion entries from {csv_files_processed} CSV files "
        f"for participant {participant_id} across {len(sessions_processed)} session(s): {sorted(sessions_processed)}"
    )
    
    return EmotionResult(
        participant_id=participant_id,
        status="success",
        message=f"Imported {total_entries} emotion entries from {csv_files_processed} CSV files across {len(sessions_processed)} session(s)",
        statistics=EmotionStatistics(
            emotion_entries=total_entries,
            csv_files_processed=csv_files_processed,
            total_emotions=total_emotions
        )
    )


async def import_csv_file(conn, session_id: str, participant_id: str, csv_path: Path, csv_type: str):
    """Import a single CSV file"""
    entries_count = 0
    emotions_count = 0
    
    # Get valid emotion names from ENUM type
    valid_emotion_names = await conn.fetch(
        "SELECT unnest(enum_range(NULL::emotion_name_enum))::text as emotion_name"
    )
    valid_emotion_set = {row['emotion_name'] for row in valid_emotion_names}
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Extract emotion scores
            emotion_scores = {}
            begin_time = float(row.get('BeginTime', 0))
            end_time = float(row.get('EndTime', begin_time + 1.0))
            record_id = row.get('Id', 'unknown')
            
            # Extract all emotion columns (skip Id, BeginTime, EndTime, BeginPosition, EndPosition, and other metadata columns)
            excluded_columns = ['Id', 'BeginTime', 'EndTime', 'BeginPosition', 'EndPosition', 'FrameNumber', 'Time', 'Confidence']
            for key, value in row.items():
                if key not in excluded_columns and key in valid_emotion_set:
                    try:
                        score = float(value)
                        if score > 0:
                            emotion_scores[key] = score
                            emotions_count += 1
                    except (ValueError, TypeError):
                        pass
            
            if not emotion_scores:
                continue
            
            # Insert based on CSV type and normalize emotion scores
            if csv_type == 'burst.csv':
                # Insert hume_burst_emotion_data record
                burst_id = await conn.fetchval(
                    """
                    INSERT INTO hume_burst_emotion_data (
                        time, session_id, participant_id, record_id,
                        begin_time, end_time, created_at
                    )
                    VALUES (NOW(), $1::uuid, $2::uuid, $3, $4, $5, NOW())
                    ON CONFLICT DO NOTHING
                    RETURNING id
                    """,
                    session_id, participant_id, record_id,
                    begin_time, end_time
                )
                
                if burst_id:
                    # Insert emotion scores into normalized table
                    for emotion_name, score in emotion_scores.items():
                        # Insert emotion score (direct ENUM type, no master table lookup)
                        await conn.execute(
                            """
                            INSERT INTO hume_burst_emotion_scores (
                                hume_burst_emotion_data_id, emotion_name, score
                            )
                            VALUES ($1::uuid, $2::emotion_name_enum, $3)
                            ON CONFLICT (hume_burst_emotion_data_id, emotion_name) DO UPDATE
                            SET score = EXCLUDED.score
                            """,
                            burst_id, emotion_name, score
                        )
                        
            elif csv_type == 'face.csv':
                # Insert hume_face_emotion_data record
                face_id = await conn.fetchval(
                    """
                    INSERT INTO hume_face_emotion_data (
                        time, session_id, participant_id, record_id,
                        begin_time, created_at
                    )
                    VALUES (NOW(), $1::uuid, $2::uuid, $3, $4, NOW())
                    ON CONFLICT DO NOTHING
                    RETURNING id
                    """,
                    session_id, participant_id, record_id,
                    begin_time
                )
                
                if face_id:
                    # Insert emotion scores into normalized table
                    for emotion_name, score in emotion_scores.items():
                        # Insert emotion score (direct ENUM type, no master table lookup)
                        await conn.execute(
                            """
                            INSERT INTO hume_face_emotion_scores (
                                hume_face_emotion_data_id, emotion_name, score
                            )
                            VALUES ($1::uuid, $2::emotion_name_enum, $3)
                            ON CONFLICT (hume_face_emotion_data_id, emotion_name) DO UPDATE
                            SET score = EXCLUDED.score
                            """,
                            face_id, emotion_name, score
                        )
                        
            elif csv_type == 'language.csv':
                # Insert hume_language_emotion_data record
                language_id = await conn.fetchval(
                    """
                    INSERT INTO hume_language_emotion_data (
                        time, session_id, participant_id, record_id,
                        begin_time, end_time, created_at
                    )
                    VALUES (NOW(), $1::uuid, $2::uuid, $3, $4, $5, NOW())
                    ON CONFLICT DO NOTHING
                    RETURNING id
                    """,
                    session_id, participant_id, record_id,
                    begin_time, end_time
                )
                
                if language_id:
                    # Insert emotion scores into normalized table
                    for emotion_name, score in emotion_scores.items():
                        # Insert emotion score (direct ENUM type, no master table lookup)
                        await conn.execute(
                            """
                            INSERT INTO hume_language_emotion_scores (
                                hume_language_emotion_data_id, emotion_name, score
                            )
                            VALUES ($1::uuid, $2::emotion_name_enum, $3)
                            ON CONFLICT (hume_language_emotion_data_id, emotion_name) DO UPDATE
                            SET score = EXCLUDED.score
                            """,
                            language_id, emotion_name, score
                        )
                        
            elif csv_type == 'prosody.csv':
                # Insert hume_prosody_emotion_data record
                prosody_id = await conn.fetchval(
                    """
                    INSERT INTO hume_prosody_emotion_data (
                        time, session_id, participant_id, record_id,
                        begin_time, created_at
                    )
                    VALUES (NOW(), $1::uuid, $2::uuid, $3, $4, NOW())
                    ON CONFLICT DO NOTHING
                    RETURNING id
                    """,
                    session_id, participant_id, record_id,
                    begin_time
                )
                
                if prosody_id:
                    # Insert emotion scores into normalized table
                    for emotion_name, score in emotion_scores.items():
                        # Insert emotion score (direct ENUM type, no master table lookup)
                        await conn.execute(
                            """
                            INSERT INTO hume_prosody_emotion_scores (
                                hume_prosody_emotion_data_id, emotion_name, score
                            )
                            VALUES ($1::uuid, $2::emotion_name_enum, $3)
                            ON CONFLICT (hume_prosody_emotion_data_id, emotion_name) DO UPDATE
                            SET score = EXCLUDED.score
                            """,
                            prosody_id, emotion_name, score
                        )
            
            entries_count += 1
    
    return entries_count, emotions_count


async def import_predictions_json(conn, session_id: str, participant_id: str, json_path: Path):
    """Import predictions from HumeAI_predictions JSON file"""
    entries_count = 0
    emotions_count = 0
    
    # Get valid emotion names from ENUM type
    valid_emotion_names = await conn.fetch(
        "SELECT unnest(enum_range(NULL::emotion_name_enum))::text as emotion_name"
    )
    valid_emotion_set = {row['emotion_name'] for row in valid_emotion_names}
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # JSON structure: list[dict] where dict has 'results' key
    if not isinstance(data, list) or len(data) == 0:
        logger.warning(f"Invalid JSON structure in {json_path}")
        return entries_count, emotions_count
    
    first_item = data[0]
    if 'results' not in first_item or not isinstance(first_item['results'], dict):
        logger.warning(f"No 'results' key found in {json_path}")
        return entries_count, emotions_count
    
    results = first_item['results']
    if 'predictions' not in results or not isinstance(results['predictions'], list):
        logger.warning(f"No 'predictions' key found in {json_path}")
        return entries_count, emotions_count
    
    predictions = results['predictions']
    if len(predictions) == 0:
        logger.warning(f"Empty predictions list in {json_path}")
        return entries_count, emotions_count
    
    prediction = predictions[0]
    if 'models' not in prediction or not isinstance(prediction['models'], dict):
        logger.warning(f"No 'models' key found in predictions")
        return entries_count, emotions_count
    
    models = prediction['models']
    
    # Process each model type
    for model_type in ['burst', 'language', 'prosody', 'face']:
        if model_type not in models:
            continue
        
        model_data = models[model_type]
        if 'grouped_predictions' not in model_data or not isinstance(model_data['grouped_predictions'], list):
            continue
        
        grouped_predictions = model_data['grouped_predictions']
        if len(grouped_predictions) == 0:
            continue
        
        # Process each grouped prediction
        for grouped in grouped_predictions:
            if 'predictions' not in grouped or not isinstance(grouped['predictions'], list):
                continue
            
            record_id = grouped.get('id', 'unknown')
            
            # Process each prediction in the group
            for pred in grouped['predictions']:
                entries, emotions = await import_prediction(
                    conn, session_id, participant_id, model_type, pred, record_id, valid_emotion_set
                )
                entries_count += entries
                emotions_count += emotions
    
    return entries_count, emotions_count


async def import_prediction(conn, session_id: str, participant_id: str, model_type: str, pred: dict, record_id: str, valid_emotion_set: set):
    """Import a single prediction entry"""
    entries_count = 0
    emotions_count = 0
    
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
            if name in valid_emotion_set and score > 0:
                emotion_scores[name] = score
                emotions_count += 1
    
    # Note: We still insert entries even if there are no emotions, as they may have other metadata
    # But we skip if there's no useful data at all
    # For face, we might have box/probability without emotions, so we allow it
    # For other types, we require at least some emotions
    if not emotion_scores and model_type != 'face':
        return entries_count, emotions_count
    
    # Insert based on model type
    if model_type == 'burst':
        # Extract descriptions (vocal types)
        descriptions = pred.get('descriptions', [])
        vocal_types = [desc.get('name', '') for desc in descriptions if isinstance(desc, dict) and desc.get('name')]
        
        burst_id = await conn.fetchval(
            """
            INSERT INTO hume_burst_emotion_data (
                time, session_id, participant_id, record_id,
                begin_time, end_time, created_at
            )
            VALUES (NOW(), $1::uuid, $2::uuid, $3, $4, $5, NOW())
            ON CONFLICT DO NOTHING
            RETURNING id
            """,
            session_id, participant_id, record_id,
            begin_time, end_time
        )
        
        if burst_id:
            # Insert emotion scores
            for emotion_name, score in emotion_scores.items():
                await conn.execute(
                    """
                    INSERT INTO hume_burst_emotion_scores (
                        hume_burst_emotion_data_id, emotion_name, score
                    )
                    VALUES ($1::uuid, $2::emotion_name_enum, $3)
                    ON CONFLICT (hume_burst_emotion_data_id, emotion_name) DO UPDATE
                    SET score = EXCLUDED.score
                    """,
                    burst_id, emotion_name, score
                )
            
            # Insert vocal types as metadata
            for vocal_type in vocal_types:
                await conn.execute(
                    """
                    INSERT INTO hume_burst_metadata (
                        hume_burst_emotion_data_id, metadata_type, text_value
                    )
                    VALUES ($1::uuid, 'vocal_type', $2)
                    ON CONFLICT (hume_burst_emotion_data_id, metadata_type, text_value) DO NOTHING
                    """,
                    burst_id, vocal_type
                )
            
            entries_count += 1
    
    elif model_type == 'language':
        text = pred.get('text', '')
        confidence = pred.get('confidence')
        speaker_confidence = pred.get('speaker_confidence')
        toxicity = pred.get('toxicity')
        
        language_id = await conn.fetchval(
            """
            INSERT INTO hume_language_emotion_data (
                time, session_id, participant_id, record_id,
                text, begin_time, end_time, created_at
            )
            VALUES (NOW(), $1::uuid, $2::uuid, $3, $4, $5, $6, NOW())
            ON CONFLICT DO NOTHING
            RETURNING id
            """,
            session_id, participant_id, record_id,
            text, begin_time, end_time
        )
        
        if language_id:
            # Insert emotion scores
            for emotion_name, score in emotion_scores.items():
                await conn.execute(
                    """
                    INSERT INTO hume_language_emotion_scores (
                        hume_language_emotion_data_id, emotion_name, score
                    )
                    VALUES ($1::uuid, $2::emotion_name_enum, $3)
                    ON CONFLICT (hume_language_emotion_data_id, emotion_name) DO UPDATE
                    SET score = EXCLUDED.score
                    """,
                    language_id, emotion_name, score
                )
            
            # Insert metadata
            # Note: confidence and speaker_confidence are not stored in metadata tables
            # as there's no corresponding metadata_type_enum value. They could be added
            # to the hume_language_emotion_data table schema if needed.
            
            if text:
                await conn.execute(
                    """
                    INSERT INTO hume_language_metadata (
                        hume_language_emotion_data_id, metadata_type, text_value
                    )
                    VALUES ($1::uuid, 'text_content', $2)
                    ON CONFLICT (hume_language_emotion_data_id, metadata_type, text_value) DO NOTHING
                    """,
                    language_id, text
                )
            
            # Insert toxicity scores if present
            if isinstance(toxicity, dict):
                for tox_type, tox_score in toxicity.items():
                    if isinstance(tox_score, (int, float)):
                        await conn.execute(
                            """
                            INSERT INTO hume_language_metadata (
                                hume_language_emotion_data_id, metadata_type, value, text_value
                            )
                            VALUES ($1::uuid, 'toxicity_score', $2, $3)
                            ON CONFLICT (hume_language_emotion_data_id, metadata_type, text_value) DO NOTHING
                            """,
                            language_id, float(tox_score), tox_type
                        )
            
            entries_count += 1
    
    elif model_type == 'prosody':
        confidence = pred.get('confidence')
        speaker_confidence = pred.get('speaker_confidence')
        
        prosody_id = await conn.fetchval(
            """
            INSERT INTO hume_prosody_emotion_data (
                time, session_id, participant_id, record_id,
                begin_time, created_at
            )
            VALUES (NOW(), $1::uuid, $2::uuid, $3, $4, NOW())
            ON CONFLICT DO NOTHING
            RETURNING id
            """,
            session_id, participant_id, record_id,
            begin_time
        )
        
        if prosody_id:
            # Insert emotion scores
            for emotion_name, score in emotion_scores.items():
                await conn.execute(
                    """
                    INSERT INTO hume_prosody_emotion_scores (
                        hume_prosody_emotion_data_id, emotion_name, score
                    )
                    VALUES ($1::uuid, $2::emotion_name_enum, $3)
                    ON CONFLICT (hume_prosody_emotion_data_id, emotion_name) DO UPDATE
                    SET score = EXCLUDED.score
                    """,
                    prosody_id, emotion_name, score
                )
            
            # Note: Prosody metadata (pitch, volume, etc.) would need to be extracted from
            # additional fields in the prediction if available. For now, we only store emotions.
            
            entries_count += 1
    
    elif model_type == 'face':
        frame = pred.get('frame')
        prob = pred.get('prob')
        box = pred.get('box', {})
        facs = pred.get('facs')
        
        # For face, we insert even if there are no emotions, as long as we have frame/prob/box data
        if not emotion_scores and prob is None and not box:
            return entries_count, emotions_count
        
        face_id = await conn.fetchval(
            """
            INSERT INTO hume_face_emotion_data (
                time, session_id, participant_id, record_id,
                frame, begin_time, probability, 
                face_x0, face_y0, face_width, face_height,
                created_at
            )
            VALUES (NOW(), $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            ON CONFLICT DO NOTHING
            RETURNING id
            """,
            session_id, participant_id, record_id,
            frame, begin_time, prob,
            box.get('x'), box.get('y'), box.get('w'), box.get('h')
        )
        
        if face_id:
            # Insert emotion scores (if any)
            for emotion_name, score in emotion_scores.items():
                await conn.execute(
                    """
                    INSERT INTO hume_face_emotion_scores (
                        hume_face_emotion_data_id, emotion_name, score
                    )
                    VALUES ($1::uuid, $2::emotion_name_enum, $3)
                    ON CONFLICT (hume_face_emotion_data_id, emotion_name) DO UPDATE
                    SET score = EXCLUDED.score
                    """,
                    face_id, emotion_name, score
                )
            
            # Insert probability as metadata
            if prob is not None:
                await conn.execute(
                    """
                    INSERT INTO hume_face_metadata (
                        hume_face_emotion_data_id, metadata_type, value
                    )
                    VALUES ($1::uuid, 'face_probability', $2)
                    ON CONFLICT (hume_face_emotion_data_id, metadata_type, text_value) DO NOTHING
                    """,
                    face_id, float(prob)
                )
            
            # Insert face position metadata
            if box:
                if 'x' in box:
                    await conn.execute(
                        """
                        INSERT INTO hume_face_metadata (
                            hume_face_emotion_data_id, metadata_type, value
                        )
                        VALUES ($1::uuid, 'face_position_x', $2)
                        ON CONFLICT (hume_face_emotion_data_id, metadata_type, text_value) DO NOTHING
                        """,
                        face_id, float(box['x'])
                    )
                if 'y' in box:
                    await conn.execute(
                        """
                        INSERT INTO hume_face_metadata (
                            hume_face_emotion_data_id, metadata_type, value
                        )
                        VALUES ($1::uuid, 'face_position_y', $2)
                        ON CONFLICT (hume_face_emotion_data_id, metadata_type, text_value) DO NOTHING
                        """,
                        face_id, float(box['y'])
                    )
                if 'w' in box:
                    await conn.execute(
                        """
                        INSERT INTO hume_face_metadata (
                            hume_face_emotion_data_id, metadata_type, value
                        )
                        VALUES ($1::uuid, 'face_width', $2)
                        ON CONFLICT (hume_face_emotion_data_id, metadata_type, text_value) DO NOTHING
                        """,
                        face_id, float(box['w'])
                    )
                if 'h' in box:
                    await conn.execute(
                        """
                        INSERT INTO hume_face_metadata (
                            hume_face_emotion_data_id, metadata_type, value
                        )
                        VALUES ($1::uuid, 'face_height', $2)
                        ON CONFLICT (hume_face_emotion_data_id, metadata_type, text_value) DO NOTHING
                        """,
                        face_id, float(box['h'])
                    )
            
            # Insert frame number as metadata
            if frame is not None:
                await conn.execute(
                    """
                    INSERT INTO hume_face_metadata (
                        hume_face_emotion_data_id, metadata_type, value
                    )
                    VALUES ($1::uuid, 'frame_number', $2)
                    ON CONFLICT (hume_face_emotion_data_id, metadata_type, text_value) DO NOTHING
                    """,
                    face_id, float(frame)
                )
            
            # Insert FACS (Facial Action Coding System) data if present
            if isinstance(facs, dict):
                for au_name, au_score in facs.items():
                    if isinstance(au_score, (int, float)):
                        await conn.execute(
                            """
                            INSERT INTO hume_face_metadata (
                                hume_face_emotion_data_id, metadata_type, value, text_value
                            )
                            VALUES ($1::uuid, 'action_unit', $2, $3)
                            ON CONFLICT (hume_face_emotion_data_id, metadata_type, text_value) DO NOTHING
                            """,
                            face_id, float(au_score), au_name
                        )
            
            entries_count += 1
    
    return entries_count, emotions_count


@router.post("/emotions/predictions/{participant_id}", response_model=EmotionResult)
async def import_predictions_for_participant(participant_id: str):
    """Import predictions from HumeAI_predictions JSON file for a single participant"""
    dataset_path = Path(os.getenv("DATASET_PATH", "/app/dataset/participants"))
    participant_path = dataset_path / participant_id
    
    if not participant_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Participant directory not found: {participant_path}"
        )
    
    # Check if participant exists
    pool = await get_db_pool()
    
    try:
        async with pool.acquire() as conn:
            participant_exists = await conn.fetchval(
                "SELECT id FROM participants WHERE id::text = $1",
                participant_id
            )
            
            if not participant_exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Participant {participant_id} not found. Import participants first."
                )
            
            # Get all sessions for this participant
            session_rows = await conn.fetch(
                "SELECT id, session_index FROM sessions WHERE participant_id::text = $1 ORDER BY session_index",
                participant_id
            )
            
            if not session_rows:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No sessions found for participant {participant_id}. Import sessions first."
                )
            
            # Find HumeAI_predictions JSON files
            predictions_files = list(participant_path.glob("HumeAI_artifacts_*/HumeAI_predictions_*.json"))
            
            if not predictions_files:
                return EmotionResult(
                    participant_id=participant_id,
                    status="skipped",
                    message="HumeAI_predictions JSON files not found",
                    statistics=None
                )
            
            total_entries = 0
            total_emotions = 0
            files_processed = 0
            
            async with conn.transaction():
                # Delete existing emotion data for all sessions of this participant
                await conn.execute(
                    "DELETE FROM hume_burst_emotion_data WHERE participant_id::text = $1",
                    participant_id
                )
                await conn.execute(
                    "DELETE FROM hume_face_emotion_data WHERE participant_id::text = $1",
                    participant_id
                )
                await conn.execute(
                    "DELETE FROM hume_language_emotion_data WHERE participant_id::text = $1",
                    participant_id
                )
                await conn.execute(
                    "DELETE FROM hume_prosody_emotion_data WHERE participant_id::text = $1",
                    participant_id
                )
                
                # Process each predictions file
                # Map predictions files to sessions based on artifact directory structure
                session_map = {row['session_index']: str(row['id']) for row in session_rows}
                
                for predictions_file in predictions_files:
                    # Try to extract session_index from the artifact directory structure
                    # The predictions file is in: HumeAI_artifacts_*/HumeAI_predictions_*.json
                    # We need to check if there's a registry_file-* directory in the same artifacts directory
                    artifacts_dir = predictions_file.parent
                    session_id = None
                    
                    # Look for registry_file directories in the same artifacts directory
                    registry_dirs = list(artifacts_dir.glob("registry_file-*"))
                    if registry_dirs:
                        # Extract session_index from the first registry_file directory
                        session_index = extract_session_index_from_registry_dir(registry_dirs[0].name)
                        if session_index is not None and session_index in session_map:
                            session_id = session_map[session_index]
                    
                    # Fallback: use the first session if we couldn't determine the session
                    if not session_id and session_map:
                        session_id = list(session_map.values())[0]
                        logger.warning(
                            f"Could not determine session for {predictions_file.name}, "
                            f"using first session {session_id}"
                        )
                    
                    if session_id:
                        entries, emotions = await import_predictions_json(
                            conn, session_id, participant_id, predictions_file
                        )
                        total_entries += entries
                        total_emotions += emotions
                        files_processed += 1
                        logger.info(
                            f"Imported {entries} entries from {predictions_file.name} "
                            f"for participant {participant_id}, session {session_id}"
                        )
            
            return EmotionResult(
                participant_id=participant_id,
                status="success",
                message=f"Imported {total_entries} emotion entries from {files_processed} predictions file(s)",
                statistics=EmotionStatistics(
                    emotion_entries=total_entries,
                    csv_files_processed=files_processed,
                    total_emotions=total_emotions
                )
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing predictions for participant {participant_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import predictions for participant {participant_id}: {str(e)}"
        )

