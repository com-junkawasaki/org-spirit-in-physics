"""
Sessions import router
Merkle DAG: import.service.import.sessions
"""
import json
import logging
import os
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.database import get_db_pool

logger = logging.getLogger(__name__)

router = APIRouter()


class SessionStatistics(BaseModel):
    total_events: int
    word_responses_count: int
    average_reaction_time: Optional[float] = None
    session_duration: Optional[int] = None


class SessionResult(BaseModel):
    participant_id: str
    status: str
    message: str
    statistics: Optional[SessionStatistics] = None


class ImportResult(BaseModel):
    success: bool
    total: int
    processed: int
    results: List[SessionResult]


@router.post("/sessions", response_model=ImportResult)
async def import_sessions():
    """Import sessions from dataset directory"""
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
                    result = await process_session(conn, participant_id, participant_dir)
                    results.append(result)
        except Exception as e:
            logger.error(f"Error importing session for participant {participant_id}: {e}")
            results.append(SessionResult(
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


async def process_session(conn, participant_id: str, participant_path: Path):
    """Process a single session"""
    # Check if participant exists
    participant_exists = await conn.fetchval(
        "SELECT id FROM participants WHERE id::text = $1",
        participant_id
    )
    
    if not participant_exists:
        raise ValueError(f"Participant {participant_id} not found. Import participants first.")
    
    # Read session_data.json
    session_data_path = participant_path / "session_data.json"
    if not session_data_path.exists():
        raise ValueError(f"session_data.json not found for participant {participant_id}")
    
    with open(session_data_path, 'r', encoding='utf-8') as f:
        session_data = json.load(f)
    
    events = session_data.get('events', [])
    if not events:
        raise ValueError(f"No events found in session_data.json for participant {participant_id}")
    
    # Calculate session times
    start_ts = events[0].get('timestamp') if events else None
    end_event = next(
        (e for e in reversed(events) if e.get('type') == 'response_window_closed'),
        None
    )
    end_ts = end_event.get('timestamp') if end_event else (events[-1].get('timestamp') if events else None)
    
    if not start_ts:
        raise ValueError(f"No start timestamp found for participant {participant_id}")
    
    # Calculate statistics
    word_responses = [
        e for e in events
        if e.get('type') == 'word_displayed' and any(
            later.get('type') == 'speech_detected' and later.get('timestamp', 0) > e.get('timestamp', 0)
            for later in events
        )
    ]
    
    reaction_times = []
    for word_event in word_responses:
        word_ts = word_event.get('timestamp')
        speech_event = next(
            (e for e in events if e.get('type') == 'speech_detected' and e.get('timestamp', 0) > word_ts),
            None
        )
        if speech_event:
            reaction_times.append(speech_event.get('timestamp', 0) - word_ts)
    
    avg_reaction_time = sum(reaction_times) / len(reaction_times) if reaction_times else None
    session_duration = (end_ts - start_ts) if end_ts and start_ts else None
    
    # Insert or update session (without events JSONB column)
    session_id = await conn.fetchval(
        """
        INSERT INTO sessions (id, participant_id, session_index, start_ts, end_ts, created_at, updated_at)
        VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (participant_id, session_index) DO UPDATE SET
            start_ts = EXCLUDED.start_ts,
            end_ts = EXCLUDED.end_ts,
            updated_at = NOW()
        RETURNING id
        """,
        participant_id,
        0,  # session_index
        start_ts,
        end_ts
    )
    
    # Delete existing session events
    await conn.execute(
        "DELETE FROM session_events WHERE session_id = $1::uuid",
        session_id
    )
    
    # Insert events into session_events table
    for event in events:
        event_type_str = event.get('type')
        if not event_type_str:
            continue
        
        # Get or create event type
        event_type_id = await conn.fetchval(
            """
            INSERT INTO event_types (event_type)
            VALUES ($1::event_type_enum)
            ON CONFLICT (event_type) DO UPDATE SET event_type = EXCLUDED.event_type
            RETURNING id
            """,
            event_type_str
        )
        
        event_timestamp = event.get('timestamp', start_ts)
        event_data = json.dumps(event.get('data', {})) if event.get('data') else None
        word_id = event.get('word_id')
        reaction_time_ms = event.get('reaction_time_ms')
        
        await conn.execute(
            """
            INSERT INTO session_events (
                session_id, event_type_id, event_timestamp, event_data, word_id, reaction_time_ms
            )
            VALUES ($1::uuid, $2, $3, $4, $5, $6)
            ON CONFLICT DO NOTHING
            """,
            session_id,
            event_type_id,
            event_timestamp,
            event_data,
            word_id,
            reaction_time_ms
        )
    
    logger.info(f"Imported session {session_id} for participant {participant_id}")
    
    return SessionResult(
        participant_id=participant_id,
        status="success",
        message=f"Session imported successfully (ID: {session_id})",
        statistics=SessionStatistics(
            total_events=len(events),
            word_responses_count=len(word_responses),
            average_reaction_time=avg_reaction_time / 1000.0 if avg_reaction_time else None,
            session_duration=session_duration
        )
    )

