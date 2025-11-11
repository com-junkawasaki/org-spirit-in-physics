"""
Timeline import router
Merkle DAG: import.service.import.timeline
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


class TimelineResult(BaseModel):
    participant_id: str
    session_id: str
    status: str
    message: str
    timeline_points_count: int


class ImportResult(BaseModel):
    success: bool
    total_sessions: int
    processed_sessions: int
    total_timeline_points: int
    results: List[TimelineResult]


@router.post("/timeline", response_model=ImportResult)
async def import_timeline():
    """Import timeline points by integrating session, emotion, and physiological data"""
    pool = await get_db_pool()
    
    # Get all sessions
    async with pool.acquire() as conn:
        sessions = await conn.fetch(
            """
            SELECT id, participant_id, session_index, start_ts, end_ts
            FROM sessions
            ORDER BY participant_id, session_index
            """
        )
    
    total_sessions = len(sessions)
    results = []
    total_timeline_points = 0
    
    for session_row in sessions:
        session_id = str(session_row['id'])
        participant_id = str(session_row['participant_id'])
        session_index = session_row['session_index']
        start_ts = session_row['start_ts']
        end_ts = session_row['end_ts']
        
        try:
            async with pool.acquire() as conn:
                async with conn.transaction():
                    result = await process_session_timeline(
                        conn, participant_id, session_id, session_index, start_ts, end_ts
                    )
                    results.append(result)
                    total_timeline_points += result.timeline_points_count
        except Exception as e:
            logger.error(f"Error importing timeline for session {session_id}: {e}")
            results.append(TimelineResult(
                participant_id=participant_id,
                session_id=session_id,
                status="error",
                message=str(e),
                timeline_points_count=0
            ))
    
    return ImportResult(
        success=True,
        total_sessions=total_sessions,
        processed_sessions=len(results),
        total_timeline_points=total_timeline_points,
        results=results
    )


async def process_session_timeline(conn, participant_id: str, session_id: str,
                                   session_index: int, start_ts: int, end_ts: Optional[int]):
    """Process timeline for a single session"""
    # Delete existing timeline points
    await conn.execute(
        "DELETE FROM timeline_points WHERE session_id::text = $1",
        session_id
    )
    
    # Get session events
    events_json = await conn.fetchval(
        "SELECT events FROM sessions WHERE id::text = $1",
        session_id
    )
    
    if not events_json:
        raise ValueError(f"No events found for session {session_id}")
    
    events = json.loads(events_json) if isinstance(events_json, str) else events_json
    
    # Filter word_displayed events
    word_events = [e for e in events if e.get('type') == 'word_displayed']
    
    if not word_events:
        return TimelineResult(
            participant_id=participant_id,
            session_id=session_id,
            status="skipped",
            message="No word_displayed events found",
            timeline_points_count=0
        )
    
    # Get emotion data
    emotion_data = await get_emotion_data(conn, session_id, participant_id)
    
    # Get physiological data
    physiological_data = await get_physiological_data(conn, session_id, participant_id)
    
    # Process each word event
    timeline_points_count = 0
    
    for idx, event in enumerate(word_events):
        timestamp = event.get('timestamp')
        word = event.get('payload', {}).get('word', 'Unknown')
        
        # Calculate reaction time
        reaction_time = calculate_reaction_time(events, timestamp, idx)
        
        # Find related emotions (within ±60 seconds)
        relative_timestamp_sec = (timestamp - start_ts) / 1000.0
        related_emotions = find_related_emotions(emotion_data, relative_timestamp_sec)
        
        # Find related physiological data (within ±5 seconds)
        related_physiological = find_related_physiological(physiological_data, timestamp)
        
        # Build emotions array (deduplicate by name and fileType)
        emotions_dict = {}  # Key: (name, fileType), Value: max score
        for emotion in related_emotions:
            emotion_scores = emotion.get('emotion_scores', {})
            file_type = emotion.get('file_type', 'unknown')
            
            for name, score in emotion_scores.items():
                if score > 0:
                    normalized_name = normalize_emotion_name(name)
                    key = (normalized_name, file_type)
                    # Keep the maximum score for each emotion name + fileType combination
                    if key not in emotions_dict or emotions_dict[key] < score:
                        emotions_dict[key] = float(score)
        
        # Convert dict to array
        emotions_array = [
            {
                'name': name,
                'score': score,
                'fileType': file_type
            }
            for (name, file_type), score in emotions_dict.items()
        ]
        
        # Build physiological object
        physiological_obj = {
            'average': 0.0,
            'max': 0.0,
            'min': 0.0,
            'channels': {}
        }
        
        if related_physiological:
            all_values = []
            for physio in related_physiological:
                channels = physio.get('channels', {})
                all_values.extend([v for v in channels.values() if isinstance(v, (int, float))])
            
            if all_values:
                physiological_obj['average'] = sum(all_values) / len(all_values)
                physiological_obj['max'] = max(all_values)
                physiological_obj['min'] = min(all_values)
        
        # Calculate reaction value
        emotion_total = sum(e['score'] for e in emotions_array)
        reaction_value = emotion_total + physiological_obj['average']
        
        # Build metadata
        metadata = {
            'emotionCount': len(related_emotions),
            'physiologicalCount': len(related_physiological)
        }
        
        # Convert timestamp to datetime
        from datetime import datetime, timezone
        time_dt = datetime.fromtimestamp(timestamp / 1000.0, tz=timezone.utc)
        
        # Insert timeline point
        await conn.execute(
            """
            INSERT INTO timeline_points (
                time, participant_id, session_id, word, event_type,
                reaction_value, reaction_time, has_response,
                emotions, physiological, metadata, created_at
            )
            VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, NOW())
            """,
            time_dt, participant_id, session_id, word, 'word_displayed',
            reaction_value,
            reaction_time / 1000.0 if reaction_time else None,
            reaction_time is not None,
            json.dumps(emotions_array),
            json.dumps(physiological_obj),
            json.dumps(metadata)
        )
        
        timeline_points_count += 1
    
    logger.info(f"Created {timeline_points_count} timeline points for session {session_id}")
    
    return TimelineResult(
        participant_id=participant_id,
        session_id=session_id,
        status="success",
        message=f"Created {timeline_points_count} timeline points",
        timeline_points_count=timeline_points_count
    )


async def get_emotion_data(conn, session_id: str, participant_id: str):
    """Get emotion data for a session"""
    emotion_entries = []
    
    # Get burst emotion data
    burst_rows = await conn.fetch(
        """
        SELECT begin_time, end_time, emotion_scores
        FROM burst_emotion_data
        WHERE session_id::text = $1
        ORDER BY begin_time ASC NULLS LAST
        """,
        session_id
    )
    
    for row in burst_rows:
        emotion_scores = json.loads(row['emotion_scores']) if isinstance(row['emotion_scores'], str) else row['emotion_scores']
        emotion_entries.append({
            'begin_time': row['begin_time'],
            'end_time': row['end_time'],
            'emotion_scores': emotion_scores,
            'file_type': 'burst'
        })
    
    # Get face emotion data
    face_rows = await conn.fetch(
        """
        SELECT begin_time, emotion_scores
        FROM face_emotion_data
        WHERE session_id::text = $1
        ORDER BY begin_time ASC NULLS LAST
        """,
        session_id
    )
    
    for row in face_rows:
        emotion_scores = json.loads(row['emotion_scores']) if isinstance(row['emotion_scores'], str) else row['emotion_scores']
        emotion_entries.append({
            'begin_time': row['begin_time'],
            'end_time': row['begin_time'] + 1.0 if row['begin_time'] else None,
            'emotion_scores': emotion_scores,
            'file_type': 'face'
        })
    
    # Get language emotion data
    language_rows = await conn.fetch(
        """
        SELECT begin_time, end_time, emotion_scores
        FROM language_emotion_data
        WHERE session_id::text = $1
        ORDER BY begin_time ASC NULLS LAST
        """,
        session_id
    )
    
    for row in language_rows:
        emotion_scores = json.loads(row['emotion_scores']) if isinstance(row['emotion_scores'], str) else row['emotion_scores']
        emotion_entries.append({
            'begin_time': row['begin_time'],
            'end_time': row['end_time'],
            'emotion_scores': emotion_scores,
            'file_type': 'language'
        })
    
    # Get prosody emotion data
    prosody_rows = await conn.fetch(
        """
        SELECT begin_time, emotion_scores
        FROM prosody_emotion_data
        WHERE session_id::text = $1
        ORDER BY begin_time ASC NULLS LAST
        """,
        session_id
    )
    
    for row in prosody_rows:
        emotion_scores = json.loads(row['emotion_scores']) if isinstance(row['emotion_scores'], str) else row['emotion_scores']
        emotion_entries.append({
            'begin_time': row['begin_time'],
            'end_time': None,
            'emotion_scores': emotion_scores,
            'file_type': 'prosody'
        })
    
    return emotion_entries


async def get_physiological_data(conn, session_id: str, participant_id: str):
    """Get physiological data for a session"""
    # Check if physiological_data table exists
    table_exists = await conn.fetchval(
        """
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'physiological_data'
        )
        """
    )
    
    if not table_exists:
        return []
    
    # Try to get physiological data
    try:
        rows = await conn.fetch(
            """
            SELECT time, channels
            FROM physiological_data
            WHERE session_id::text = $1
            ORDER BY time ASC
            """,
            session_id
        )
        
        entries = []
        for row in rows:
            channels = json.loads(row['channels']) if isinstance(row['channels'], str) else row['channels']
            timestamp_ms = int(row['time'].timestamp() * 1000) if hasattr(row['time'], 'timestamp') else None
            entries.append({
                'timestamp': timestamp_ms,
                'channels': channels or {}
            })
        return entries
    except Exception:
        # Try with individual channel columns
        rows = await conn.fetch(
            """
            SELECT time, ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8
            FROM physiological_data
            WHERE session_id::text = $1
            ORDER BY time ASC
            """,
            session_id
        )
        
        entries = []
        for row in rows:
            channels = {}
            for i in range(1, 9):
                ch_value = row.get(f'ch{i}')
                if ch_value is not None:
                    channels[f'Ch{i}'] = float(ch_value)
            
            timestamp_ms = int(row['time'].timestamp() * 1000) if hasattr(row['time'], 'timestamp') else None
            entries.append({
                'timestamp': timestamp_ms,
                'channels': channels
            })
        return entries


def calculate_reaction_time(events, timestamp: int, event_index: int):
    """Calculate reaction time for a word event"""
    for i in range(event_index + 1, len(events)):
        event = events[i]
        event_type = event.get('type')
        event_timestamp = event.get('timestamp')
        
        if event_type == 'speech_detected' and event_timestamp and event_timestamp > timestamp:
            return event_timestamp - timestamp
        elif event_type == 'response_window_closed' and event_timestamp and event_timestamp > timestamp:
            return event_timestamp - timestamp
    
    return None


def find_related_emotions(emotion_data, relative_timestamp_sec: float):
    """Find emotions related to a timestamp (within ±5 seconds for precise matching)"""
    search_start_sec = max(0, relative_timestamp_sec - 5)
    search_end_sec = relative_timestamp_sec + 5
    
    related = []
    zero_time_emotions = []  # Collect emotions with begin_time = 0 separately
    
    for emotion in emotion_data:
        begin_time = emotion.get('begin_time')
        if begin_time is None or begin_time == 0:
            # Collect zero-time emotions separately (will be added once per session)
            zero_time_emotions.append(emotion)
            continue
        
        end_time = emotion.get('end_time') or (begin_time + 1.0)
        
        # Check if emotion time range overlaps with search window (±5 seconds)
        if begin_time <= search_end_sec and end_time >= search_start_sec:
            related.append(emotion)
    
    # Add zero-time emotions only if no time-specific emotions were found
    # This prevents zero-time emotions from being added to every point
    if len(related) == 0 and len(zero_time_emotions) > 0:
        # Only add the first zero-time emotion entry to avoid duplication
        related.extend(zero_time_emotions[:1])
    
    return related


def find_related_physiological(physiological_data, timestamp: int):
    """Find physiological data related to a timestamp"""
    related = []
    for physio in physiological_data:
        physio_timestamp = physio.get('timestamp')
        if physio_timestamp and abs(physio_timestamp - timestamp) <= 5000:
            related.append(physio)
    return related


def normalize_emotion_name(name: str) -> str:
    """Normalize emotion name"""
    cleaned = name.replace(' (negative)', '').replace(' (positive)', '').strip().lower()
    
    mapping = {
        'surprise (negative)': 'surprise',
        'surprise (positive)': 'surprise',
        'surprise': 'surprise',
        'joy': 'joy',
        'sadness': 'sadness',
        'anger': 'anger',
        'fear': 'fear',
        'disgust': 'disgust',
        'calmness': 'calm',
        'concentration': 'focus',
        'excitement': 'excitement',
        'confusion': 'confusion'
    }
    
    return mapping.get(cleaned, cleaned)

