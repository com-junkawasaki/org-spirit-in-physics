"""
Timeline import router
Merkle DAG: import.service.import.timeline
"""
import json
import logging
import os
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel

from app.database import get_db_pool

logger = logging.getLogger(__name__)

router = APIRouter()


class EmotionDataDebug(BaseModel):
    burst: dict
    face: dict
    language: dict
    prosody: dict
    total: int


class TimelineDebugResult(BaseModel):
    participant_id: str
    session_id: str
    session_exists: bool
    emotion_data: EmotionDataDebug
    timeline_points_count: int
    timeline_points_with_emotions: int
    emotion_types_in_timeline: List[str]


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
    
    # マテリアライズドビューをリフレッシュ
    async with pool.acquire() as conn:
        try:
            await conn.execute("SELECT refresh_timeline_materialized_views();")
            logger.info("Refreshed materialized views after timeline import")
        except Exception as e:
            logger.warning(f"Failed to refresh materialized views: {e}")
    
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
    
    # Get session events from session_events table
    event_rows = await conn.fetch(
        """
        SELECT 
            se.event_type as type,
            se.event_timestamp as timestamp,
            se.event_data as data,
            se.word_id,
            se.reaction_time_ms
        FROM session_events se
        WHERE se.session_id::text = $1
        ORDER BY se.event_timestamp ASC
        """,
        session_id
    )
    
    if not event_rows:
        raise ValueError(f"No events found for session {session_id}")
    
    # Convert to list of dicts
    events = []
    for row in event_rows:
        event = {
            'type': row['type'],
            'timestamp': row['timestamp']
        }
        if row['data']:
            try:
                event['data'] = json.loads(row['data']) if isinstance(row['data'], str) else row['data']
            except:
                pass
        if row['word_id']:
            event['word_id'] = row['word_id']
        if row['reaction_time_ms']:
            event['reaction_time_ms'] = row['reaction_time_ms']
        events.append(event)
    
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
        
        # Find related emotions (within ±5 seconds for better coverage)
        # Expanded from ±2 seconds to capture more emotion data
        relative_timestamp_sec = (timestamp - start_ts) / 1000.0
        related_emotions = find_related_emotions(emotion_data, relative_timestamp_sec, time_window_sec=5.0)
        if idx < 5:  # Log first 5 events for debugging
            logger.debug(f"[process_session_timeline] Event {idx}: word={word}, relative_ts={relative_timestamp_sec:.2f}s, found {len(related_emotions)} related emotions (time_window=±5.0s)")
        
        # Find related physiological data (within ±5 seconds)
        related_physiological = find_related_physiological(physiological_data, timestamp)
        
        # Build emotions array with optimizations:
        # 1. Score threshold: lowered to 0.01 to include more emotion data (was 0.1)
        # 2. Deduplicate by name and fileType (keep max score)
        # 3. Limit to top 10 emotions per file_type (increased from 5)
        EMOTION_SCORE_THRESHOLD = 0.01  # Lowered from 0.1 to capture more data
        emotions_dict = {}  # Key: (name, fileType), Value: max score
        total_scores_processed = 0
        scores_below_threshold = 0
        invalid_emotion_names = 0
        
        for emotion in related_emotions:
            emotion_scores = emotion.get('emotion_scores', {})
            file_type = emotion.get('file_type', 'unknown')
            
            for name, score in emotion_scores.items():
                total_scores_processed += 1
                # Apply score threshold: lowered to 0.01 to include more emotion data
                score_float = float(score)
                if score_float >= EMOTION_SCORE_THRESHOLD:
                    # Use emotion name as-is (already validated against ENUM in import_emotions)
                    # ENUM type is case-sensitive, so use the original name from database
                    key = (name, file_type)
                    # Keep the maximum score for each emotion name + fileType combination
                    if key not in emotions_dict or emotions_dict[key] < score_float:
                        emotions_dict[key] = score_float
                else:
                    scores_below_threshold += 1
        
        # Log debug info for first few events
        if idx < 5:
            logger.debug(f"[process_session_timeline] Event {idx}: word={word}, processed {total_scores_processed} scores, "
                       f"below_threshold={scores_below_threshold}, invalid_names={invalid_emotion_names}, "
                       f"final_emotions={len(emotions_dict)}")
        
        # Group by file_type and keep top 5 per file_type
        emotions_by_file_type = {}
        for (name, file_type), score in emotions_dict.items():
            if file_type not in emotions_by_file_type:
                emotions_by_file_type[file_type] = []
            emotions_by_file_type[file_type].append({
                'name': name,
                'score': score,
                'fileType': file_type
            })
        
        # Sort by score descending and keep top 10 per file_type (increased from 5)
        emotions_array = []
        for file_type, emotion_list in emotions_by_file_type.items():
            sorted_emotions = sorted(emotion_list, key=lambda x: x['score'], reverse=True)
            emotions_array.extend(sorted_emotions[:10])  # Increased from 5 to 10
        
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
        
        # Insert timeline point (without emotions and physiological JSONB columns)
        await conn.execute(
            """
            INSERT INTO timeline_points (
                time, participant_id, session_id, word, event_type,
                reaction_value, reaction_time, has_response,
                created_at
            )
            VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (time, participant_id, session_id) DO UPDATE SET
                word = EXCLUDED.word,
                event_type = EXCLUDED.event_type,
                reaction_value = EXCLUDED.reaction_value,
                reaction_time = EXCLUDED.reaction_time,
                has_response = EXCLUDED.has_response
            """,
            time_dt, participant_id, session_id, word, 'word_displayed',
            reaction_value,
            reaction_time / 1000.0 if reaction_time else None,
            reaction_time is not None
        )
        
        # Insert emotions into normalized table
        for emotion in emotions_array:
            emotion_name_raw = emotion['name']
            emotion_score = emotion['score']
            file_type = emotion['fileType']
            
            # Insert emotion entry (direct ENUM type, PostgreSQL will validate)
            # Skip invalid emotion names by catching the exception
            try:
                await conn.execute(
                    """
                    INSERT INTO timeline_emotion_entries (
                        timeline_point_time, timeline_point_participant_id, timeline_point_session_id,
                        emotion_name, score, file_type
                    )
                    VALUES ($1, $2::uuid, $3::uuid, $4::emotion_name_enum, $5, $6::emotion_file_type)
                    ON CONFLICT (timeline_point_time, timeline_point_participant_id, timeline_point_session_id, emotion_name, file_type) DO UPDATE
                    SET score = EXCLUDED.score
                    """,
                    time_dt, participant_id, session_id,
                    emotion_name_raw, emotion_score, file_type
                )
            except Exception as e:
                # Skip invalid emotion names (e.g., not in ENUM type)
                logger.debug(f"Skipping invalid emotion name '{emotion_name_raw}' for timeline point at {time_dt}: {e}")
                continue
        
        # Insert physiological measurements into normalized table
        if related_physiological:
            for physio in related_physiological:
                channels = physio.get('channels', {})
                for measurement_type, value in channels.items():
                    if not isinstance(value, (int, float)):
                        continue
                    
                    # Insert measurement (direct ENUM type, no master table lookup)
                    await conn.execute(
                        """
                        INSERT INTO physiological_measurements (
                            timeline_point_time, timeline_point_participant_id, timeline_point_session_id,
                            measurement_type, value, unit
                        )
                        VALUES ($1, $2::uuid, $3::uuid, $4::measurement_type_enum, $5, 'unknown'::measurement_unit_enum)
                        ON CONFLICT (timeline_point_time, timeline_point_participant_id, timeline_point_session_id, measurement_type) DO UPDATE
                        SET value = EXCLUDED.value
                        """,
                        time_dt, participant_id, session_id,
                        measurement_type, float(value)
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
    """Get emotion data for a session from normalized tables"""
    emotion_entries = []
    
    # Get burst emotion data with normalized scores
    burst_rows = await conn.fetch(
        """
        SELECT 
            bed.begin_time,
            bed.end_time,
            json_object_agg(bes.emotion_name::text, bes.score) FILTER (WHERE bes.id IS NOT NULL) as emotion_scores
        FROM hume_burst_emotion_data bed
        LEFT JOIN hume_burst_emotion_scores bes ON bes.hume_burst_emotion_data_id = bed.id
        WHERE bed.session_id::text = $1
        GROUP BY bed.id, bed.begin_time, bed.end_time
        ORDER BY bed.begin_time ASC NULLS LAST
        """,
        session_id
    )
    logger.info(f"[get_emotion_data] Found {len(burst_rows)} burst emotion records for session {session_id}")
    
    for row in burst_rows:
        emotion_scores_raw = row['emotion_scores']
        if isinstance(emotion_scores_raw, str):
            emotion_scores = json.loads(emotion_scores_raw) if emotion_scores_raw else {}
        else:
            emotion_scores = emotion_scores_raw or {}
        emotion_entries.append({
            'begin_time': row['begin_time'],
            'end_time': row['end_time'],
            'emotion_scores': emotion_scores,
            'file_type': 'burst'
        })
    
    # Get face emotion data with normalized scores
    face_rows = await conn.fetch(
        """
        SELECT 
            fed.begin_time,
            json_object_agg(fes.emotion_name::text, fes.score) FILTER (WHERE fes.id IS NOT NULL) as emotion_scores
        FROM hume_face_emotion_data fed
        LEFT JOIN hume_face_emotion_scores fes ON fes.hume_face_emotion_data_id = fed.id
        WHERE fed.session_id::text = $1
        GROUP BY fed.id, fed.begin_time
        ORDER BY fed.begin_time ASC NULLS LAST
        """,
        session_id
    )
    logger.info(f"[get_emotion_data] Found {len(face_rows)} face emotion records for session {session_id}")
    
    for row in face_rows:
        emotion_scores_raw = row['emotion_scores']
        if isinstance(emotion_scores_raw, str):
            emotion_scores = json.loads(emotion_scores_raw) if emotion_scores_raw else {}
        else:
            emotion_scores = emotion_scores_raw or {}
        emotion_entries.append({
            'begin_time': row['begin_time'],
            'end_time': row['begin_time'] + 1.0 if row['begin_time'] else None,
            'emotion_scores': emotion_scores,
            'file_type': 'face'
        })
    
    # Get language emotion data with normalized scores
    language_rows = await conn.fetch(
        """
        SELECT 
            led.begin_time,
            led.end_time,
            json_object_agg(les.emotion_name::text, les.score) FILTER (WHERE les.id IS NOT NULL) as emotion_scores
        FROM hume_language_emotion_data led
        LEFT JOIN hume_language_emotion_scores les ON les.hume_language_emotion_data_id = led.id
        WHERE led.session_id::text = $1
        GROUP BY led.id, led.begin_time, led.end_time
        ORDER BY led.begin_time ASC NULLS LAST
        """,
        session_id
    )
    logger.info(f"[get_emotion_data] Found {len(language_rows)} language emotion records for session {session_id}")
    
    for row in language_rows:
        emotion_scores_raw = row['emotion_scores']
        if isinstance(emotion_scores_raw, str):
            emotion_scores = json.loads(emotion_scores_raw) if emotion_scores_raw else {}
        else:
            emotion_scores = emotion_scores_raw or {}
        emotion_entries.append({
            'begin_time': row['begin_time'],
            'end_time': row['end_time'],
            'emotion_scores': emotion_scores,
            'file_type': 'language'
        })
    
    # Get prosody emotion data with normalized scores
    prosody_rows = await conn.fetch(
        """
        SELECT 
            ped.begin_time,
            json_object_agg(pes.emotion_name::text, pes.score) FILTER (WHERE pes.id IS NOT NULL) as emotion_scores
        FROM hume_prosody_emotion_data ped
        LEFT JOIN hume_prosody_emotion_scores pes ON pes.hume_prosody_emotion_data_id = ped.id
        WHERE ped.session_id::text = $1
        GROUP BY ped.id, ped.begin_time
        ORDER BY ped.begin_time ASC NULLS LAST
        """,
        session_id
    )
    logger.info(f"[get_emotion_data] Found {len(prosody_rows)} prosody emotion records for session {session_id}")
    
    for row in prosody_rows:
        emotion_scores_raw = row['emotion_scores']
        if isinstance(emotion_scores_raw, str):
            emotion_scores = json.loads(emotion_scores_raw) if emotion_scores_raw else {}
        else:
            emotion_scores = emotion_scores_raw or {}
        emotion_entries.append({
            'begin_time': row['begin_time'],
            'end_time': None,
            'emotion_scores': emotion_scores,
            'file_type': 'prosody'
        })
    
    logger.info(f"[get_emotion_data] Total emotion entries: {len(emotion_entries)} for session {session_id}")
    return emotion_entries


@router.get("/timeline/debug/{participant_id}")
async def debug_timeline_data(
    participant_id: str,
    session_id: Optional[str] = Query(None, description="Optional session ID to check specific session")
):
    """Debug endpoint to check emotion data status"""
    pool = await get_db_pool()
    
    async with pool.acquire() as conn:
        # Get session
        if session_id:
            session_row = await conn.fetchrow(
                "SELECT id, session_index, start_ts, end_ts FROM sessions WHERE id::text = $1",
                session_id
            )
        else:
            session_row = await conn.fetchrow(
                "SELECT id, session_index, start_ts, end_ts FROM sessions WHERE participant_id::text = $1 ORDER BY session_index LIMIT 1",
                participant_id
            )
        
        if not session_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session not found for participant {participant_id}"
            )
        
        target_session_id = str(session_row['id'])
        
        # Check emotion data tables
        emotion_counts = {}
        for table_name, emotion_type in [
            ('hume_burst_emotion_data', 'burst'),
            ('hume_face_emotion_data', 'face'),
            ('hume_language_emotion_data', 'language'),
            ('hume_prosody_emotion_data', 'prosody'),
        ]:
            table_exists = await conn.fetchval(
                """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = $1
                )
                """,
                table_name
            )
            
            if not table_exists:
                emotion_counts[emotion_type] = {'exists': False, 'count': 0}
                continue
            
            count = await conn.fetchval(
                f"SELECT COUNT(*) FROM {table_name} WHERE session_id::text = $1",
                target_session_id
            )
            emotion_counts[emotion_type] = {'exists': True, 'count': count}
        
        # Check timeline_points
        timeline_stats = await conn.fetchrow(
            """
            SELECT 
                COUNT(*) as total_points,
                COUNT(DISTINCT tee.id) as points_with_emotions
            FROM timeline_points
            WHERE session_id::text = $1
            """,
            target_session_id
        )
        
        # Get emotion types in timeline
        emotion_types = await conn.fetch(
            """
            SELECT DISTINCT tee.file_type as file_type
            FROM timeline_emotion_entries tee
            JOIN timeline_points tp ON tee.timeline_point_time = tp.time
                AND tee.timeline_point_participant_id = tp.participant_id
                AND tee.timeline_point_session_id = tp.session_id
            WHERE tp.session_id::text = $1
            """,
            target_session_id
        )
        
        emotion_types_list = [row['file_type'] for row in emotion_types if row['file_type']]
        
        return TimelineDebugResult(
            participant_id=participant_id,
            session_id=target_session_id,
            session_exists=True,
            emotion_data=EmotionDataDebug(
                burst=emotion_counts['burst'],
                face=emotion_counts['face'],
                language=emotion_counts['language'],
                prosody=emotion_counts['prosody'],
                total=sum(c['count'] for c in emotion_counts.values())
            ),
            timeline_points_count=timeline_stats['total_points'] if timeline_stats else 0,
            timeline_points_with_emotions=timeline_stats['points_with_emotions'] if timeline_stats else 0,
            emotion_types_in_timeline=emotion_types_list
        )


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


def find_related_emotions(emotion_data, relative_timestamp_sec: float, time_window_sec: float = 5.0):
    """Find emotions related to a timestamp (within ±time_window_sec seconds)
    
    Args:
        emotion_data: List of emotion entries
        relative_timestamp_sec: Timestamp relative to session start (in seconds)
        time_window_sec: Time window in seconds (default: 5.0, expanded from 2.0)
    """
    search_start_sec = max(0, relative_timestamp_sec - time_window_sec)
    search_end_sec = relative_timestamp_sec + time_window_sec
    
    related = []
    zero_time_emotions_by_type = {}  # Group zero-time emotions by file_type
    
    for emotion in emotion_data:
        begin_time = emotion.get('begin_time')
        file_type = emotion.get('file_type', 'unknown')
        
        if begin_time is None or begin_time == 0:
            # Collect zero-time emotions by file_type (will be added once per file_type)
            if file_type not in zero_time_emotions_by_type:
                zero_time_emotions_by_type[file_type] = []
            zero_time_emotions_by_type[file_type].append(emotion)
            continue
        
        end_time = emotion.get('end_time') or (begin_time + 1.0)
        
        # Check if emotion time range overlaps with search window (±2 seconds)
        if begin_time <= search_end_sec and end_time >= search_start_sec:
            related.append(emotion)
    
    # Add zero-time emotions by file_type if no time-specific emotions of that type were found
    # This ensures each file_type (face, burst, etc.) gets at least one entry if available
    for file_type, zero_emotions in zero_time_emotions_by_type.items():
        # Check if we already have time-specific emotions of this file_type
        has_time_specific = any(e.get('file_type') == file_type for e in related)
        if not has_time_specific and len(zero_emotions) > 0:
            # Add the first zero-time emotion entry for this file_type
            related.append(zero_emotions[0])
    
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
    """Normalize emotion name with comprehensive mapping"""
    # Remove common suffixes and clean
    cleaned = name.replace(' (negative)', '').replace(' (positive)', '').strip().lower()
    
    # Comprehensive emotion name mapping
    mapping = {
        # Basic emotions
        'surprise (negative)': 'surprise',
        'surprise (positive)': 'surprise',
        'surprise': 'surprise',
        'joy': 'joy',
        'happiness': 'joy',
        'sadness': 'sadness',
        'sad': 'sadness',
        'anger': 'anger',
        'angry': 'anger',
        'fear': 'fear',
        'afraid': 'fear',
        'disgust': 'disgust',
        'disgusted': 'disgust',
        
        # Extended emotions
        'calmness': 'calm',
        'calm': 'calm',
        'concentration': 'focus',
        'focus': 'focus',
        'excitement': 'excitement',
        'excited': 'excitement',
        'confusion': 'confusion',
        'confused': 'confusion',
        
        # Vocal expressions (burst emotions)
        'grr': 'anger',
        'hiss': 'disgust',
        'moan': 'sadness',
        'pant': 'fear',
        'screech': 'fear',
        'wow': 'surprise',
        'sympathy': 'sadness',
        'awkwardness': 'confusion',
        'contempt': 'disgust',
        
        # Face emotions
        'neutral': 'calm',
        'happy': 'joy',
        'sad': 'sadness',
        'angry': 'anger',
        'fearful': 'fear',
        'disgusted': 'disgust',
        'surprised': 'surprise',
        
        # Language emotions
        'positive': 'joy',
        'negative': 'sadness',
        'neutral': 'calm',
        
        # Prosody emotions
        'arousal': 'excitement',
        'valence': 'joy',
    }
    
    # Try exact match first
    if cleaned in mapping:
        return mapping[cleaned]
    
    # Try partial match (contains)
    for key, value in mapping.items():
        if key in cleaned or cleaned in key:
            return value
    
    # Return cleaned name if no mapping found
    return cleaned

