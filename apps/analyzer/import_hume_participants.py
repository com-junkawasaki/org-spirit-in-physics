#!/usr/bin/env python3
"""
Script to import Hume AI job IDs as participants and create corresponding sessions.
"""

import os
import json
import uuid
from datetime import datetime

def generate_hume_participants_sql():
    """Generate SQL to add Hume AI job IDs as participants and create sessions."""

    hume_data_dir = "hume_data"
    sql_statements = []

    # Get Hume AI job IDs
    hume_dirs = [d for d in os.listdir(hume_data_dir) if d.startswith('HumeAI_artifacts_')]
    hume_job_ids = [d.replace('HumeAI_artifacts_', '') for d in hume_dirs]

    print(f"Found {len(hume_job_ids)} Hume AI jobs")

    # Generate participant INSERT statements
    for job_id in hume_job_ids:
        participant_sql = f"""INSERT INTO participants (id, age, gender, handedness, created_at, updated_at)
VALUES ('{job_id}', NULL, 'prefer-not-to-say', NULL, '{datetime.now().isoformat()}', '{datetime.now().isoformat()}')
ON CONFLICT (id) DO NOTHING;"""
        sql_statements.append(participant_sql)

    # Generate experiment session INSERT statements
    for job_id in hume_job_ids:
        # Check if Hume directory has registry_file-1 (session-2) or not
        hume_dir = f"HumeAI_artifacts_{job_id}"
        registry_files = [f for f in os.listdir(os.path.join(hume_data_dir, hume_dir)) if f.startswith('registry_file-')]

        sessions_to_create = []
        if len(registry_files) >= 1:
            sessions_to_create.append('session-1')
        if len(registry_files) >= 2:
            sessions_to_create.append('session-2')

        for session_type in sessions_to_create:
            session_id = str(uuid.uuid4())
            session_sql = f"""INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    '{session_id}',
    '{job_id}',
    '{session_id}',
    '{session_type}',
    '{datetime.now().isoformat()}',
    '{datetime.now().isoformat()}',
    '{datetime.now().isoformat()}'
) ON CONFLICT (participant_id, session_type) DO NOTHING;"""
            sql_statements.append(session_sql)

    # Write SQL to file
    with open("import_hume_participants.sql", "w", encoding="utf-8") as f:
        f.write("-- Generated SQL for importing Hume AI participants and sessions\n\n")
        f.write("\\c postgres\n\n")

        for sql in sql_statements:
            f.write(sql + "\n\n")

        f.write(f"-- Total statements: {len(sql_statements)}\n")

    print(f"Generated SQL file with {len(sql_statements)} statements")

if __name__ == "__main__":
    generate_hume_participants_sql()
