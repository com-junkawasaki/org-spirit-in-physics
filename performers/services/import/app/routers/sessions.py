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


# Valid session_event_type_enum values from database schema
VALID_EVENT_TYPES = {
    'participant_initialized',
    'preflight_started',
    'preflight_devices_acquired',
    'recording_started',
    'recording_stopped_and_saved',
    'session_started',
    'word_displayed',
    'response_window_opened',
    'speech_detected',
    'response_window_closed',
    'session_data_saved',
    'session_1_completed',
    'session_1_video_saved',
    'session_2_completed',
    'test_completed',
    'test_reset',
    'media_recorder_setup_failed',
}


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
    
    # Build a list of word_displayed events for reaction time calculation
    # Store as list of tuples (word, timestamp) to handle multiple occurrences
    word_displayed_events_list = []
    for event in events:
        if event.get('type') == 'word_displayed':
            payload = event.get('payload', {})
            word = payload.get('word')
            if word:
                word_displayed_events_list.append((word, event.get('timestamp')))
    
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
    inserted_count = 0
    skipped_count = 0
    
    for event in events:
        event_type_str = event.get('type')
        if not event_type_str:
            skipped_count += 1
            continue
        
        # Validate event type against session_event_type_enum
        if event_type_str not in VALID_EVENT_TYPES:
            logger.warning(
                f"Skipping invalid event type '{event_type_str}' for participant {participant_id}. "
                f"Valid types: {', '.join(sorted(VALID_EVENT_TYPES))}"
            )
            skipped_count += 1
            continue
        
        # Extract event data from payload
        payload = event.get('payload', {})
        event_timestamp = event.get('timestamp', start_ts)
        
        # Convert payload to JSON string for event_data
        # Only store non-empty payloads
        event_data = json.dumps(payload) if payload and len(payload) > 0 else None
        
        # Extract word from payload (for future use with stimulus_words table)
        # Currently word_id is NULL as stimulus_words table integration is pending
        word_id = None  # payload.get('word') would be text, not ID
        
        # Calculate reaction_time_ms for speech_detected events
        reaction_time_ms = None
        if event_type_str == 'speech_detected':
            # Use the payload already extracted above
            word = payload.get('word') if payload else None
            if word:
                # Find the most recent word_displayed event for this word before speech_detected
                matching_word_events = [
                    ts for w, ts in word_displayed_events_list
                    if w == word and ts < event_timestamp
                ]
                if matching_word_events:
                    # Use the most recent word_displayed timestamp
                    word_displayed_ts = max(matching_word_events)
                    reaction_time_ms = int(event_timestamp - word_displayed_ts)
                else:
                    logger.debug(
                        f"No matching word_displayed event found for word '{word}' "
                        f"at timestamp {event_timestamp} for participant {participant_id}"
                    )
        
        try:
            await conn.execute(
                """
                INSERT INTO session_events (
                    session_id, event_type, event_timestamp, event_data, word_id, reaction_time_ms
                )
                VALUES ($1::uuid, $2::session_event_type_enum, $3, $4, $5, $6)
                ON CONFLICT DO NOTHING
                """,
                session_id,
                event_type_str,
                event_timestamp,
                event_data,
                word_id,
                reaction_time_ms
            )
            inserted_count += 1
        except Exception as e:
            logger.error(
                f"Error inserting event {event_type_str} for participant {participant_id}: {e}"
            )
            skipped_count += 1
    
    logger.info(
        f"Imported session {session_id} for participant {participant_id}: "
        f"{inserted_count} events inserted, {skipped_count} events skipped"
    )
    
    return SessionResult(
        participant_id=participant_id,
        status="success",
        message=f"Session imported successfully (ID: {session_id}, {inserted_count} events inserted)",
        statistics=SessionStatistics(
            total_events=len(events),
            word_responses_count=len(word_responses),
            average_reaction_time=avg_reaction_time / 1000.0 if avg_reaction_time else None,
            session_duration=session_duration
        )
    )

