#!/usr/bin/env python3
"""
Import session data from JSON file to PostgreSQL
"""
import json
import sys
import os
import psycopg2
from psycopg2.extras import Json

def import_session_data(participant_id, session_data_path, database_url):
    """Import session data from JSON file"""
    # Read session data
    with open(session_data_path, 'r', encoding='utf-8') as f:
        session_data = json.load(f)
    
    events = session_data.get('events', [])
    if not events:
        print(f"No events found in {session_data_path}")
        return False
    
    # Extract start and end times
    start_ts = events[0].get('timestamp') if events else None
    end_event = next((e for e in reversed(events) if e.get('type') == 'response_window_closed'), None)
    end_ts = end_event.get('timestamp') if end_event else events[-1].get('timestamp') if events else None
    
    if not start_ts:
        print(f"No start timestamp found")
        return False
    
    # Connect to database
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    try:
        # Check if participant exists
        cur.execute("SELECT id FROM participants WHERE id = %s", (participant_id,))
        if not cur.fetchone():
            print(f"Participant {participant_id} does not exist, creating...")
            cur.execute(
                "INSERT INTO participants (id, created_at, updated_at) VALUES (%s, NOW(), NOW()) ON CONFLICT (id) DO NOTHING",
                (participant_id,)
            )
            conn.commit()
        
        # Check if session already exists
        cur.execute(
            "SELECT id FROM sessions WHERE participant_id = %s AND session_index = %s",
            (participant_id, 0)
        )
        existing = cur.fetchone()
        
        if existing:
            print(f"Session already exists: {existing[0]}")
            session_uuid = existing[0]
        else:
            # Create session
            cur.execute(
                """
                INSERT INTO sessions (id, participant_id, session_index, start_ts, end_ts, events, created_at, updated_at)
                VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING id
                """,
                (participant_id, 0, start_ts, end_ts, Json(events))
            )
            session_uuid = cur.fetchone()[0]
            conn.commit()
            print(f"Session created: {session_uuid}")
        
        print(f"Session data imported successfully")
        print(f"  Participant: {participant_id}")
        print(f"  Session: {session_uuid}")
        print(f"  Events: {len(events)}")
        print(f"  Start time: {start_ts}")
        print(f"  End time: {end_ts}")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"Error importing session data: {e}")
        return False
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python import_session_data.py <participant_id> <session_data.json> [database_url]")
        sys.exit(1)
    
    participant_id = sys.argv[1]
    session_data_path = sys.argv[2]
    database_url = sys.argv[3] if len(sys.argv) > 3 else os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@localhost:5432/spirit_in_physics'
    )
    
    success = import_session_data(participant_id, session_data_path, database_url)
    sys.exit(0 if success else 1)

