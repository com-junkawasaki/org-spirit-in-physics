#!/usr/bin/env python3
"""
Import timeline points from session_data.json to PostgreSQL
"""
import json
import sys
import os
import psycopg2
from psycopg2.extras import Json

def import_timeline_data(participant_id, session_data_path, database_url):
    """Import timeline data from JSON file"""
    # Read session data
    with open(session_data_path, 'r', encoding='utf-8') as f:
        session_data = json.load(f)
    
    events = session_data.get('events', [])
    if not events:
        print(f"No events found in {session_data_path}")
        return False
    
    start_ts = events[0].get('timestamp') if events else None
    end_event = next((e for e in reversed(events) if e.get('type') == 'response_window_closed'), None)
    end_ts = end_event.get('timestamp') if end_event else (events[-1].get('timestamp') if events else None)
    
    word_events = [e for e in events if e.get('type') == 'word_displayed']
    print(f'Total events: {len(events)}')
    print(f'Word displayed events: {len(word_events)}')
    
    if not start_ts:
        print(f"No start timestamp found")
        return False
    
    # Connect to database
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    try:
        # Create participant
        cur.execute(
            "INSERT INTO participants (id, created_at, updated_at) VALUES (%s, NOW(), NOW()) ON CONFLICT (id) DO NOTHING",
            (participant_id,)
        )
        
        # Create/update session
        cur.execute("""
            INSERT INTO sessions (id, participant_id, session_index, start_ts, end_ts, events, created_at, updated_at)
            VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (participant_id, session_index) DO UPDATE SET
                events = EXCLUDED.events,
                start_ts = EXCLUDED.start_ts,
                end_ts = EXCLUDED.end_ts,
                updated_at = NOW()
            RETURNING id
        """, (participant_id, 0, start_ts, end_ts, Json(events)))
        
        session_id = cur.fetchone()[0]
        print(f'Session: {session_id}')
        
        # Delete existing timeline points
        cur.execute("DELETE FROM timeline_points WHERE participant_id = %s", (participant_id,))
        print('Deleted existing timeline points')
        
        # Generate timeline points
        timeline_count = 0
        for event in events:
            if event.get('type') == 'word_displayed':
                timestamp = event['timestamp']
                word = event.get('payload', {}).get('word', 'Unknown')
                
                # Find reaction time
                reaction_event = next((
                    e for e in events 
                    if e['timestamp'] > timestamp and 
                    (e.get('type') == 'speech_detected' or e.get('type') == 'response_window_closed')
                ), None)
                reaction_time = (reaction_event['timestamp'] - timestamp) / 1000.0 if reaction_event else None
                
                time_ts = timestamp / 1000.0
                
                cur.execute("""
                    INSERT INTO timeline_points (
                        time, participant_id, session_id, word, event_type,
                        reaction_value, reaction_time, has_response,
                        emotions, physiological, metadata, created_at
                    )
                    VALUES (
                        to_timestamp(%s),
                        %s,
                        %s,
                        %s,
                        'word_displayed',
                        0.0,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        NOW()
                    )
                """, (
                    time_ts,
                    participant_id,
                    session_id,
                    word,
                    reaction_time,
                    reaction_time is not None,
                    Json([]),
                    Json({"average": 0, "max": 0, "min": 0, "channels": {}}),
                    Json({"emotionCount": 0, "physiologicalCount": 0})
                ))
                
                timeline_count += 1
                if timeline_count % 50 == 0:
                    print(f'Inserted {timeline_count} timeline points...')
        
        conn.commit()
        print(f'Created {timeline_count} timeline points')
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f'Error importing timeline data: {e}')
        import traceback
        traceback.print_exc()
        return False
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python import_timeline_direct.py <participant_id> <session_data.json> [database_url]")
        sys.exit(1)
    
    participant_id = sys.argv[1]
    session_data_path = sys.argv[2]
    database_url = sys.argv[3] if len(sys.argv) > 3 else os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@localhost:5432/spirit_in_physics'
    )
    
    success = import_timeline_data(participant_id, session_data_path, database_url)
    sys.exit(0 if success else 1)

