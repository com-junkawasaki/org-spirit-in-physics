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
            logger.error(f"Error importing session for participant {participant_id}: {e}", exc_info=True)
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


@router.post("/sessions/{participant_id}", response_model=SessionResult)
async def import_participant_sessions(participant_id: str):
    """Import sessions for a single participant"""
    dataset_path = Path(os.getenv("DATASET_PATH", "/app/dataset/participants"))
    participant_path = dataset_path / participant_id
    
    if not participant_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Participant directory not found: {participant_path}"
        )
    
    pool = await get_db_pool()
    
    async with pool.acquire() as conn:
        async with conn.transaction():
            result = await process_session(conn, participant_id, participant_path)
            return result


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


def split_events_by_session(events: List[dict]) -> dict:
    """Split events by session number"""
    sessions = {}
    current_session = None
    session_start_idx = 0
    
    # Track session numbers from recording_started events as well
    for i, event in enumerate(events):
        event_type = event.get('type')
        payload = event.get('payload', {})
        
        # Detect session start from recording_started or session_started
        if event_type == 'recording_started':
            session_num = payload.get('session')
            if session_num is not None and current_session is None:
                # First session starts here
                current_session = session_num
                session_start_idx = i
        elif event_type == 'session_started':
            session_num = payload.get('session')
            if session_num is not None:
                # Save previous session if exists
                if current_session is not None and current_session != session_num:
                    sessions[current_session] = events[session_start_idx:i]
                # Start new session
                current_session = session_num
                session_start_idx = i
        
        # Detect session completion
        elif event_type in ('session_1_completed', 'session_2_completed'):
            session_num = 1 if 'session_1' in event_type else 2
            if current_session == session_num:
                # Include completion event in current session
                if current_session not in sessions:
                    sessions[current_session] = events[session_start_idx:i+1]
                current_session = None
                session_start_idx = i + 1
    
    # Add final session if exists
    if current_session is not None:
        sessions[current_session] = events[session_start_idx:]
    
    # If no sessions detected, treat all events as session 1
    if not sessions:
        sessions[1] = events
    
    return sessions


async def process_session(conn, participant_id: str, participant_path: Path):
    """Process all sessions for a participant"""
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
    
    all_events = session_data.get('events', [])
    if not all_events:
        raise ValueError(f"No events found in session_data.json for participant {participant_id}")
    
    logger.info(f"Processing participant {participant_id}: {len(all_events)} total events")
    
    # Split events by session
    sessions_dict = split_events_by_session(all_events)
    
    logger.info(f"Found {len(sessions_dict)} sessions for participant {participant_id}: {list(sessions_dict.keys())}")
    
    results = []
    total_inserted = 0
    total_skipped = 0
    
    # Process each session
    for session_num, events in sessions_dict.items():
        session_index = session_num - 1  # Convert to 0-based index
        
        if not events:
            logger.warning(f"No events found for session {session_num} of participant {participant_id}")
            continue
        
        logger.info(f"Processing session {session_num} (index {session_index}) for participant {participant_id}: {len(events)} events")
    
    # Calculate session times
    start_ts = events[0].get('timestamp') if events else None
        # Find the last response_window_closed or session completion event
    end_event = next(
            (e for e in reversed(events) if e.get('type') in ('response_window_closed', 'session_1_completed', 'session_2_completed')),
        None
    )
    end_ts = end_event.get('timestamp') if end_event else (events[-1].get('timestamp') if events else None)
    
    if not start_ts:
            logger.warning(f"No start timestamp found for session {session_num} of participant {participant_id}")
            continue
    
    # Build a list of word_displayed events for reaction time calculation
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
    
        # Insert or update session
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
            session_index,
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
            f"Imported session {session_num} (index {session_index}) {session_id} for participant {participant_id}: "
        f"{inserted_count} events inserted, {skipped_count} events skipped"
    )
        
        total_inserted += inserted_count
        total_skipped += skipped_count
        
        results.append({
            'session_index': session_index,
            'session_id': session_id,
            'inserted_count': inserted_count,
            'skipped_count': skipped_count,
            'statistics': SessionStatistics(
                total_events=len(events),
                word_responses_count=len(word_responses),
                average_reaction_time=avg_reaction_time / 1000.0 if avg_reaction_time else None,
                session_duration=session_duration
            )
        })
    
    # Return summary result
    sessions_summary = ", ".join([f"session {r['session_index']+1} ({r['inserted_count']} events)" for r in results])
    
    return SessionResult(
        participant_id=participant_id,
        status="success",
        message=f"Imported {len(results)} session(s) for participant {participant_id}: {sessions_summary}. Total: {total_inserted} events inserted, {total_skipped} events skipped",
        statistics=SessionStatistics(
            total_events=sum(r['statistics'].total_events for r in results),
            word_responses_count=sum(r['statistics'].word_responses_count for r in results),
            average_reaction_time=sum(r['statistics'].average_reaction_time or 0 for r in results) / len(results) if results else None,
            session_duration=sum(r['statistics'].session_duration or 0 for r in results) if results else None
        )
    )
