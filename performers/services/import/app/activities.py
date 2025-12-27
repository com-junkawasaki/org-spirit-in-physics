import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from temporalio import activity
from app.database import get_db_pool

logger = logging.getLogger(__name__)

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

class ImportActivities:
    def __init__(self):
        pass

    @activity.define
    async def process_participant(self, input: Dict[str, Any]) -> Dict[str, Any]:
        participant_id = input["participant_id"]
        participant_path_str = input["participant_path"]
        participant_path = Path(participant_path_str)
        
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Check if participant already exists
            existing = await conn.fetchval(
                "SELECT id FROM participants WHERE id::text = $1",
                participant_id
            )
            
            if existing:
                logger.info(f"Participant {participant_id} already exists, skipping")
                return {
                    "participant_id": participant_id,
                    "status": "skipped",
                    "message": "Participant already exists"
                }
            
            # Read consent.json
            consent_path = participant_path / "consent.json"
            if not consent_path.exists():
                raise ValueError(f"consent.json not found for participant {participant_id}")
            
            with open(consent_path, 'r', encoding='utf-8') as f:
                consent_data = json.load(f)
            
            # Insert participant
            await conn.execute(
                """
                INSERT INTO participants (id, created_at, updated_at)
                VALUES ($1::uuid, NOW(), NOW())
                """,
                participant_id
            )
            
            logger.info(f"Imported participant {participant_id}")
            
            return {
                "participant_id": participant_id,
                "status": "success",
                "message": "Participant imported successfully",
                "metadata": {"consent": consent_data}
            }

    @activity.define
    async def process_session(self, input: Dict[str, Any]) -> Dict[str, Any]:
        participant_id = input["participant_id"]
        participant_path_str = input["participant_path"]
        participant_path = Path(participant_path_str)
        
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Check if participant exists
            participant_exists = await conn.fetchval(
                "SELECT id FROM participants WHERE id::text = $1",
                participant_id
            )
            
            if not participant_exists:
                return {
                    "participant_id": participant_id,
                    "status": "error",
                    "message": f"Participant {participant_id} not found."
                }
            
            # Read session_data.json
            session_data_path = participant_path / "session_data.json"
            if not session_data_path.exists():
                return {
                    "participant_id": participant_id,
                    "status": "skipped",
                    "message": "session_data.json not found"
                }
            
            with open(session_data_path, 'r', encoding='utf-8') as f:
                session_data = json.load(f)
            
            events = session_data.get('events', [])
            if not events:
                return {
                    "participant_id": participant_id,
                    "status": "skipped",
                    "message": "No events found in session_data.json"
                }
            
            # Calculate session times
            start_ts = events[0].get('timestamp')
            end_event = next(
                (e for e in reversed(events) if e.get('type') == 'response_window_closed'),
                None
            )
            end_ts = end_event.get('timestamp') if end_event else (events[-1].get('timestamp') if events else None)
            
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
                0,  # session_index
                start_ts,
                end_ts
            )
            
            # Delete existing session events
            await conn.execute(
                "DELETE FROM session_events WHERE session_id = $1::uuid",
                session_id
            )
            
            # Build word_displayed map for reaction time calculation
            word_displayed_events = []
            for event in events:
                if event.get('type') == 'word_displayed':
                    word = event.get('payload', {}).get('word')
                    if word:
                        word_displayed_events.append((word, event.get('timestamp')))

            # Insert events
            inserted_count = 0
            for event in events:
                event_type = event.get('type')
                if event_type not in VALID_EVENT_TYPES:
                    continue
                
                payload = event.get('payload', {})
                event_ts = event.get('timestamp', start_ts)
                
                reaction_time_ms = None
                if event_type == 'speech_detected':
                    word = payload.get('word')
                    if word:
                        matching = [ts for w, ts in word_displayed_events if w == word and ts < event_ts]
                        if matching:
                            reaction_time_ms = int(event_ts - max(matching))
                
                await conn.execute(
                    """
                    INSERT INTO session_events (
                        session_id, event_type, event_timestamp, event_data, reaction_time_ms
                    )
                    VALUES ($1::uuid, $2::session_event_type_enum, $3, $4, $5)
                    ON CONFLICT DO NOTHING
                    """,
                    session_id,
                    event_type,
                    event_ts,
                    json.dumps(payload) if payload else None,
                    reaction_time_ms
                )
                inserted_count += 1
            
            return {
                "participant_id": participant_id,
                "status": "success",
                "message": f"Imported session (ID: {session_id}, {inserted_count} events)",
                "session_id": str(session_id)
            }

    @activity.define
    async def list_participant_directories(self, dataset_path_str: str) -> List[Dict[str, str]]:
        dataset_path = Path(dataset_path_str)
        if not dataset_path.exists():
            raise FileNotFoundError(f"Dataset directory not found: {dataset_path}")
        
        return [
            {"participant_id": d.name, "participant_path": str(d)}
            for d in dataset_path.iterdir() if d.is_dir()
        ]
