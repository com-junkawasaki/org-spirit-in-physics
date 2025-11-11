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


async def process_emotions(conn, participant_id: str, participant_path: Path):
    """Process emotions for a single participant"""
    # Check if participant exists
    participant_exists = await conn.fetchval(
        "SELECT id FROM participants WHERE id::text = $1",
        participant_id
    )
    
    if not participant_exists:
        raise ValueError(f"Participant {participant_id} not found. Import participants first.")
    
    # Get session ID
    session_id = await conn.fetchval(
        "SELECT id FROM sessions WHERE participant_id::text = $1 AND session_index = 0 LIMIT 1",
        participant_id
    )
    
    if not session_id:
        raise ValueError(f"Session not found for participant {participant_id}. Import sessions first.")
    
    # Find HumeAI artifacts directory
    hume_artifacts_dirs = list(participant_path.glob("HumeAI_artifacts_*"))
    if not hume_artifacts_dirs:
        return EmotionResult(
            participant_id=participant_id,
            status="skipped",
            message="HumeAI artifacts directory not found",
            statistics=None
        )
    
    # Delete existing emotion data
    await conn.execute(
        "DELETE FROM burst_emotion_data WHERE participant_id::text = $1",
        participant_id
    )
    await conn.execute(
        "DELETE FROM face_emotion_data WHERE participant_id::text = $1",
        participant_id
    )
    await conn.execute(
        "DELETE FROM language_emotion_data WHERE participant_id::text = $1",
        participant_id
    )
    await conn.execute(
        "DELETE FROM prosody_emotion_data WHERE participant_id::text = $1",
        participant_id
    )
    
    total_entries = 0
    csv_files_processed = 0
    total_emotions = 0
    
    # Process each artifacts directory
    for artifacts_dir in hume_artifacts_dirs:
        # Find registry_file directories
        for registry_dir in artifacts_dir.glob("registry_file-*"):
            csv_dir = registry_dir / "csv"
            if not csv_dir.exists():
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
    
    logger.info(
        f"Imported {total_entries} emotion entries from {csv_files_processed} CSV files "
        f"for participant {participant_id}"
    )
    
    return EmotionResult(
        participant_id=participant_id,
        status="success",
        message=f"Imported {total_entries} emotion entries",
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
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Extract emotion scores
            emotion_scores = {}
            begin_time = float(row.get('BeginTime', 0))
            end_time = float(row.get('EndTime', begin_time + 1.0))
            record_id = row.get('Id', 'unknown')
            
            # Extract all emotion columns (skip Id, BeginTime, EndTime)
            for key, value in row.items():
                if key not in ['Id', 'BeginTime', 'EndTime']:
                    try:
                        score = float(value)
                        if score > 0:
                            emotion_scores[key] = score
                            emotions_count += 1
                    except (ValueError, TypeError):
                        pass
            
            if not emotion_scores:
                continue
            
            # Insert based on CSV type
            if csv_type == 'burst.csv':
                await conn.execute(
                    """
                    INSERT INTO burst_emotion_data (
                        time, session_id, participant_id, record_id,
                        begin_time, end_time, emotion_scores, created_at
                    )
                    VALUES (NOW(), $1::uuid, $2::uuid, $3, $4, $5, $6::jsonb, NOW())
                    ON CONFLICT DO NOTHING
                    """,
                    session_id, participant_id, record_id,
                    begin_time, end_time, json.dumps(emotion_scores)
                )
            elif csv_type == 'face.csv':
                await conn.execute(
                    """
                    INSERT INTO face_emotion_data (
                        time, session_id, participant_id, record_id,
                        begin_time, emotion_scores, created_at
                    )
                    VALUES (NOW(), $1::uuid, $2::uuid, $3, $4, $5::jsonb, NOW())
                    ON CONFLICT DO NOTHING
                    """,
                    session_id, participant_id, record_id,
                    begin_time, json.dumps(emotion_scores)
                )
            elif csv_type == 'language.csv':
                await conn.execute(
                    """
                    INSERT INTO language_emotion_data (
                        time, session_id, participant_id, record_id,
                        begin_time, end_time, emotion_scores, created_at
                    )
                    VALUES (NOW(), $1::uuid, $2::uuid, $3, $4, $5, $6::jsonb, NOW())
                    ON CONFLICT DO NOTHING
                    """,
                    session_id, participant_id, record_id,
                    begin_time, end_time, json.dumps(emotion_scores)
                )
            elif csv_type == 'prosody.csv':
                await conn.execute(
                    """
                    INSERT INTO prosody_emotion_data (
                        time, session_id, participant_id, record_id,
                        begin_time, emotion_scores, created_at
                    )
                    VALUES (NOW(), $1::uuid, $2::uuid, $3, $4, $5::jsonb, NOW())
                    ON CONFLICT DO NOTHING
                    """,
                    session_id, participant_id, record_id,
                    begin_time, json.dumps(emotion_scores)
                )
            
            entries_count += 1
    
    return entries_count, emotions_count

