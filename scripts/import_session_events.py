#!/usr/bin/env python3
"""
Import session events from session_data.json to PostgreSQL
"""
import json
import sys
import os

# Read session data
participant_id = '5346d514-e501-457a-aff1-55c92074a6f2'
session_data_path = 'apps/researcher/public/dataset/participants/5346d514-e501-457a-aff1-55c92074a6f2/session_data.json'

with open(session_data_path, 'r', encoding='utf-8') as f:
    session_data = json.load(f)

events = session_data.get('events', [])
if not events:
    print("No events found")
    sys.exit(1)

# Get session ID from database
import subprocess
result = subprocess.run(
    [
        'docker', 'exec', '-i', 'spirit-postgres',
        'psql', '-U', 'postgres', '-d', 'spirit_in_physics', '-t', '-A', '-c',
        f"SELECT id FROM sessions WHERE participant_id = '{participant_id}'::uuid AND session_index = 0 LIMIT 1;"
    ],
    capture_output=True,
    text=True
)
session_id = result.stdout.strip()
if not session_id:
    print("Session not found")
    sys.exit(1)

print(f"Session ID: {session_id}")
print(f"Total events: {len(events)}")

# Generate SQL to insert events
sql_statements = []
sql_statements.append(f"DELETE FROM session_events WHERE session_id = '{session_id}'::uuid;")

for event in events:
    event_type = event.get('type', '')
    if not event_type:
        continue
    
    timestamp = event.get('timestamp')
    event_data = json.dumps(event.get('payload', {})) if event.get('payload') else None
    word_id = event.get('payload', {}).get('word') if event.get('payload') else None
    reaction_time_ms = None  # Calculate if needed
    
    # Escape single quotes in JSON
    if event_data:
        event_data = event_data.replace("'", "''")
    
    sql = f"""
    INSERT INTO session_events (
        session_id, event_type, event_timestamp, event_data, word_id, reaction_time_ms
    )
    VALUES (
        '{session_id}'::uuid,
        '{event_type}'::session_event_type_enum,
        {timestamp},
        {'\'' + event_data + '\'' if event_data else 'NULL'}::jsonb,
        {'\'' + word_id + '\'' if word_id else 'NULL'},
        {reaction_time_ms if reaction_time_ms else 'NULL'}
    )
    ON CONFLICT DO NOTHING;
    """
    sql_statements.append(sql)

# Write SQL to file and execute
sql_file = '/tmp/import_events.sql'
with open(sql_file, 'w') as f:
    f.write('\n'.join(sql_statements))

print(f"Generated SQL file: {sql_file}")
print(f"Executing SQL...")

# Execute SQL
result = subprocess.run(
    [
        'docker', 'exec', '-i', 'spirit-postgres',
        'psql', '-U', 'postgres', '-d', 'spirit_in_physics', '-f', '/dev/stdin'
    ],
    input='\n'.join(sql_statements),
    text=True,
    capture_output=True
)

if result.returncode == 0:
    print("Events imported successfully!")
    print(result.stdout)
else:
    print("Error importing events:")
    print(result.stderr)
    sys.exit(1)

