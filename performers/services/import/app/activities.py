import json
import logging
import csv
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, Any, Optional, List
from temporalio import activity
from app.database import get_db_pool

# Import the timeline processing logic
from app.routers.timeline import process_session_timeline
from app.hume_voice import generate_audio_hume
import os

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

    @activity.defn
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

    @activity.defn
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
                "session_id": str(session_id),
                "session_index": 0,
                "start_ts": start_ts,
                "end_ts": end_ts
            }

    @activity.defn
    async def generate_timeline(self, input: Dict[str, Any]) -> Dict[str, Any]:
        participant_id = input["participant_id"]
        session_id = input["session_id"]
        session_index = input.get("session_index", 0)
        start_ts = input["start_ts"]
        end_ts = input.get("end_ts")
        
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # We use a transaction for timeline processing
            async with conn.transaction():
                result = await process_session_timeline(
                    conn, participant_id, session_id, session_index, start_ts, end_ts
                )
                
                # Refresh materialized views
                try:
                    await conn.execute("SELECT refresh_timeline_materialized_views();")
                except Exception as e:
                    logger.warning(f"Failed to refresh materialized views in activity: {e}")
                
                return {
                    "participant_id": participant_id,
                    "session_id": session_id,
                    "status": result.status,
                    "message": result.message,
                    "timeline_points_count": result.timeline_points_count
                }

    @activity.defn
    async def process_physiological_data(self, input: Dict[str, Any]) -> Dict[str, Any]:
        participant_id = input["participant_id"]
        session_id = input["session_id"]
        participant_path_str = input["participant_path"]
        participant_path = Path(participant_path_str)
        
        # Find physiological CSV file
        # Pattern: YYYY-MM-DD(*)-*.CSV
        csv_files = list(participant_path.glob("*.CSV"))
        if not csv_files:
            logger.info(f"No physiological CSV found for participant {participant_id}")
            return {"status": "skipped", "message": "No CSV file found"}
        
        # For now, take the first one (assuming one per participant/session)
        csv_path = csv_files[0]
        logger.info(f"Processing physiological data from {csv_path}")
        
        pool = await get_db_pool()
        inserted_count = 0
        
        try:
            with open(csv_path, mode='r', encoding='utf-8-sig') as f:
                lines = f.readlines()
            
            # Parse header metadata
            metadata = {}
            data_start_idx = 0
            for i, line in enumerate(lines):
                if not line.strip(): continue
                parts = [p.strip() for p in line.split(',')]
                if len(parts) >= 2:
                    metadata[parts[0]] = parts[1]
                
                if "Time_Sec" in line:
                    data_start_idx = i + 1
                    break
            
            base_date_str = metadata.get("Date")
            begin_time_str = metadata.get("Begin")
            
            if not base_date_str or not begin_time_str:
                return {"status": "error", "message": "Missing Date or Begin metadata in CSV"}
            
            # Combine Date and Begin into a datetime object
            # Format: Date=2025-07-31, Begin=15:3:49
            try:
                # Handle cases like 15:3:49 (one digit for min/sec)
                h, m, s = map(int, begin_time_str.split(':'))
                base_dt = datetime.strptime(base_date_str, "%Y-%m-%d")
                base_dt = base_dt.replace(hour=h, minute=m, second=s, tzinfo=timezone.utc)
            except Exception as e:
                return {"status": "error", "message": f"Failed to parse Date/Begin: {e}"}
            
            # Parse data rows
            async with pool.acquire() as conn:
                async with conn.transaction():
                    # Clear existing data for this session
                    await conn.execute(
                        "DELETE FROM physiological_data WHERE session_id = $1::uuid",
                        session_id
                    )
                    
                    for line in lines[data_start_idx:]:
                        if not line.strip(): continue
                        parts = [p.strip() for p in line.split(',')]
                        if len(parts) < 9: continue
                        
                        try:
                            time_sec = float(parts[0])
                            channels = [float(p) for p in parts[1:9]]
                            
                            row_time = base_dt + timedelta(seconds=time_sec)
                            
                            await conn.execute(
                                """
                                INSERT INTO physiological_data (
                                    time, participant_id, session_id,
                                    ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8
                                )
                                VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11)
                                ON CONFLICT (time, participant_id, session_id) DO NOTHING
                                """,
                                row_time, participant_id, session_id,
                                *channels
                            )
                            inserted_count += 1
                        except ValueError:
                            continue
            
            return {
                "status": "success",
                "message": f"Imported {inserted_count} physiological samples",
                "samples_count": inserted_count
            }
            
        except Exception as e:
            logger.error(f"Error processing physiological data: {e}")
            return {"status": "error", "message": str(e)}

    @activity.defn
    async def list_participant_directories(self, dataset_path_str: str) -> List[Dict[str, str]]:
        dataset_path = Path(dataset_path_str)
        if not dataset_path.exists():
            raise FileNotFoundError(f"Dataset directory not found: {dataset_path}")
        
        return [
            {"participant_id": d.name, "participant_path": str(d)}
            for d in dataset_path.iterdir() if d.is_dir()
        ]

    @activity.defn
    async def generate_stimulus_audio(self, input: Dict[str, Any]) -> Dict[str, Any]:
        word_id = input["id"]
        text = input["text"]
        lang = input["lang"]
        api_key = input["api_key"]
        
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Check if audio already exists for this language
            column_name = f"audio_{lang}"
            exists = await conn.fetchval(
                f"SELECT {column_name} FROM stimulus_words WHERE id = $1",
                word_id
            )
            
            if exists:
                return {
                    "word_id": word_id,
                    "lang": lang,
                    "status": "skipped",
                    "message": "Audio already exists in database"
                }
            
            # Generate audio
            audio_data = await generate_audio_hume(api_key, text)
            
            if not audio_data:
                return {
                    "word_id": word_id,
                    "lang": lang,
                    "status": "error",
                    "message": "Failed to generate audio from Hume AI"
                }
            
            # Store audio in database
            await conn.execute(
                f"UPDATE stimulus_words SET {column_name} = $1, updated_at = NOW() WHERE id = $2",
                audio_data,
                word_id
            )
            
            return {
                "word_id": word_id,
                "lang": lang,
                "status": "success",
                "message": f"Generated and stored {lang} audio"
            }
