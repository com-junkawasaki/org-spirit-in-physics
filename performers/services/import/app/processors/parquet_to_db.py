"""
Import Parquet files to PostgreSQL database
Merkle DAG: import.service.processors.parquet_to_db
"""
import logging
from pathlib import Path
from typing import Tuple
import pandas as pd
import pyarrow.parquet as pq
import asyncpg

from app.database import get_db_pool
from app.schemas.burst import BURST_EMOTION_NAMES
from app.schemas.language import LANGUAGE_EMOTION_NAMES
from app.schemas.prosody import PROSODY_EMOTION_NAMES
from app.schemas.face import FACE_EMOTION_NAMES

logger = logging.getLogger(__name__)


async def import_parquet_to_db(
    parquet_path: Path,
    session_id: str,
    participant_id: str,
    modality: str
) -> Tuple[int, int]:
    """
    Import Parquet file to PostgreSQL database
    
    Args:
        parquet_path: Path to Parquet file
        session_id: Session ID
        participant_id: Participant ID
        modality: One of 'burst', 'language', 'prosody', 'face'
    
    Returns:
        Tuple of (entries_count, emotions_count)
    """
    if not parquet_path.exists():
        raise FileNotFoundError(f"Parquet file not found: {parquet_path}")
    
    # Read Parquet file
    try:
        df = pd.read_parquet(parquet_path)
    except Exception as e:
        logger.error(f"Error reading parquet file {parquet_path}: {e}")
        raise
    
    if len(df) == 0:
        logger.warning(f"Empty DataFrame in {parquet_path}")
        return 0, 0
    
    # Get database connection
    pool = await get_db_pool()
    entries_count = 0
    emotions_count = 0
    
    async with pool.acquire() as conn:
        # Get valid emotion names based on modality
        emotion_name_map = {
            "burst": BURST_EMOTION_NAMES,
            "language": LANGUAGE_EMOTION_NAMES,
            "prosody": PROSODY_EMOTION_NAMES,
            "face": FACE_EMOTION_NAMES,
        }
        valid_emotion_set = set(emotion_name_map.get(modality, []))
        
        # Also check against database ENUM for validation
        db_emotion_names = await conn.fetch(
            "SELECT unnest(enum_range(NULL::emotion_name_enum))::text as emotion_name"
        )
        db_emotion_set = {row['emotion_name'] for row in db_emotion_names}
        
        # Use intersection to ensure we only use emotions that exist in both
        valid_emotion_set = valid_emotion_set & db_emotion_set
        
        # Process each row
        for _, row in df.iterrows():
            # Extract emotion scores
            emotion_scores = {}
            begin_time = float(row.get('BeginTime', 0))
            end_time = float(row.get('EndTime', begin_time + 1.0))
            record_id = str(row.get('Id', 'unknown'))
            
            # Extract all emotion columns
            excluded_columns = ['Id', 'BeginTime', 'EndTime', 'BeginPosition', 'EndPosition', 
                              'FrameNumber', 'Time', 'Confidence', 'text', 'Text', 'probability', 'prob']
            for key, value in row.items():
                if key not in excluded_columns and key in valid_emotion_set:
                    try:
                        score = float(value)
                        if pd.notna(score) and score > 0:
                            emotion_scores[key] = score
                            emotions_count += 1
                    except (ValueError, TypeError):
                        pass
            
            if not emotion_scores:
                continue
            
            # Insert based on modality
            if modality == 'burst':
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
                    entries_count += 1
            
            elif modality == 'face':
                frame_number = row.get('FrameNumber')
                prob = row.get('probability') or row.get('prob')
                
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
                    
                    # Insert metadata if available
                    if frame_number is not None:
                        await conn.execute(
                            """
                            INSERT INTO hume_face_metadata (
                                hume_face_emotion_data_id, metadata_type, value
                            )
                            VALUES ($1::uuid, 'frame_number', $2)
                            ON CONFLICT (hume_face_emotion_data_id, metadata_type) DO UPDATE
                            SET value = EXCLUDED.value
                            """,
                            face_id, float(frame_number)
                        )
                    
                    if prob is not None:
                        await conn.execute(
                            """
                            INSERT INTO hume_face_metadata (
                                hume_face_emotion_data_id, metadata_type, value
                            )
                            VALUES ($1::uuid, 'face_probability', $2)
                            ON CONFLICT (hume_face_emotion_data_id, metadata_type) DO UPDATE
                            SET value = EXCLUDED.value
                            """,
                            face_id, float(prob)
                        )
                    
                    entries_count += 1
            
            elif modality == 'language':
                text = row.get('text') or row.get('Text')
                confidence = row.get('Confidence')
                
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
                    
                    # Insert metadata if available
                    if confidence is not None:
                        await conn.execute(
                            """
                            INSERT INTO hume_language_metadata (
                                hume_language_emotion_data_id, metadata_type, value
                            )
                            VALUES ($1::uuid, 'confidence', $2)
                            ON CONFLICT (hume_language_emotion_data_id, metadata_type, text_value) DO NOTHING
                            """,
                            language_id, float(confidence)
                        )
                    
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
                    
                    entries_count += 1
            
            elif modality == 'prosody':
                confidence = row.get('Confidence')
                
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
                    
                    # Insert metadata if available
                    if confidence is not None:
                        await conn.execute(
                            """
                            INSERT INTO hume_prosody_metadata (
                                hume_prosody_emotion_data_id, metadata_type, value
                            )
                            VALUES ($1::uuid, 'confidence', $2)
                            ON CONFLICT (hume_prosody_emotion_data_id, metadata_type) DO UPDATE
                            SET value = EXCLUDED.value
                            """,
                            prosody_id, float(confidence)
                        )
                    
                    entries_count += 1
    
    return entries_count, emotions_count

