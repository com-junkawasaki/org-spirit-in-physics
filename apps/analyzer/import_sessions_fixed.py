#!/usr/bin/env python3
"""
Script to import session data from session_data.json files.
"""

import os
import json
import uuid
from datetime import datetime

def parse_timestamp(ts: int) -> str:
    """Convert Unix timestamp to ISO format."""
    return datetime.fromtimestamp(ts / 1000).isoformat()

def process_session_data():
    """Process session data for all participants."""

    data_dir = "data"
    sql_statements = []

    # Get all participant directories
    participant_dirs = [d for d in os.listdir(data_dir) if os.path.isdir(os.path.join(data_dir, d))]

    for participant_dir in participant_dirs:
        full_path = os.path.join(data_dir, participant_dir)
        participant_id = participant_dir

        # Process session_data.json
        session_file = os.path.join(full_path, "session_data.json")
        if os.path.exists(session_file):
            with open(session_file, 'r', encoding='utf-8') as f:
                session_data = json.load(f)

            events = session_data.get("events", [])

            sessions = {}

            for event in events:
                event_type = event.get("type")
                payload = event.get("payload", {})
                timestamp = parse_timestamp(event.get("timestamp"))

                if event_type == "session_started":
                    session_num = payload.get("session")
                    if session_num:
                        session_id = str(uuid.uuid4())
                        sessions[session_num] = {
                            "id": session_id,
                            "participant_id": participant_id,
                            "session_id": session_id,
                            "session_type": f"session-{session_num}",
                            "start_time": timestamp,
                            "end_time": None,
                            "created_at": timestamp,
                            "updated_at": timestamp
                        }

                elif event_type == "session_ended" or event_type == "recording_stopped_and_saved":
                    session_num = payload.get("session")
                    if session_num and session_num in sessions:
                        sessions[session_num]["end_time"] = timestamp
                        sessions[session_num]["updated_at"] = timestamp

            # Generate SQL for sessions
            for session_data in sessions.values():
                columns = ", ".join(session_data.keys())
                values = []
                for k, v in session_data.items():
                    if v is None:
                        values.append("NULL")
                    elif isinstance(v, str):
                        values.append(f"'{v.replace(chr(39), chr(39)+chr(39))}'")
                    else:
                        values.append(str(v))

                values_str = ", ".join(values)

                sql = f"""INSERT INTO participant_experiment_sessions ({columns})
VALUES ({values_str})
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;"""

                sql_statements.append(sql)

    # Write SQL to file
    with open("import_sessions_fixed.sql", "w", encoding="utf-8") as f:
        f.write("-- Generated SQL for importing session data\n\n")
        f.write("\\c postgres\n\n")

        for sql in sql_statements:
            f.write(sql + "\n\n")

        f.write(f"-- Total session statements: {len(sql_statements)}\n")

    print(f"Generated SQL file with {len(sql_statements)} session statements")

if __name__ == "__main__":
    process_session_data()
