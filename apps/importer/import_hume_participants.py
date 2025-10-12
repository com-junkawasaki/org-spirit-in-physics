#!/usr/bin/env python3
"""
Script to import Hume AI job IDs as participants and create corresponding sessions.
"""

import os
import json
import uuid
from datetime import datetime
from arangodb_client import ArangoDBClient
import yaml

def import_hume_participants():
    """Import Hume AI job IDs as participants and create sessions."""

    # Load ArangoDB configuration
    with open('config.yaml') as f:
        config = yaml.safe_load(f)

    client = ArangoDBClient(
        config['arangodb']['url'],
        config['arangodb']['user'],
        config['arangodb']['password']
    )

    if not client.connect():
        print("Failed to connect to ArangoDB")
        return

    if not client.create_database():
        print("Failed to create/access database")
        client.close()
        return

    if not client.create_collections():
        print("Failed to create collections")
        client.close()
        return

    hume_data_dir = "hume_data"
    if not os.path.exists(hume_data_dir):
        print(f"Hume data directory {hume_data_dir} not found")
        client.close()
        return

    # Get Hume AI job IDs
    hume_dirs = [d for d in os.listdir(hume_data_dir) if d.startswith('HumeAI_artifacts_')]
    hume_job_ids = [d.replace('HumeAI_artifacts_', '') for d in hume_dirs]

    print(f"Found {len(hume_job_ids)} Hume AI jobs")

    # Import participants
    for job_id in hume_job_ids:
        participant_data = {
            "_key": job_id,
            "id": job_id,
            "age": None,
            "gender": "prefer-not-to-say",
            "handedness": None,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        try:
            participants_collection = client.db.collection("participants")
            participants_collection.insert(participant_data, overwrite=True)
            print(f"✓ Created participant: {job_id}")
        except Exception as e:
            print(f"✗ Failed to create participant {job_id}: {e}")

    # Import experiment sessions
    for job_id in hume_job_ids:
        # Check if Hume directory has registry_file-1 (session-2) or not
        hume_dir = f"HumeAI_artifacts_{job_id}"
        full_hume_dir = os.path.join(hume_data_dir, hume_dir)

        if not os.path.exists(full_hume_dir):
            print(f"✗ Hume directory not found: {full_hume_dir}")
            continue

        registry_files = [f for f in os.listdir(full_hume_dir) if f.startswith('registry_file-')]

        sessions_to_create = []
        if len(registry_files) >= 1:
            sessions_to_create.append('session-1')
        if len(registry_files) >= 2:
            sessions_to_create.append('session-2')

        for session_type in sessions_to_create:
            session_id = str(uuid.uuid4())
            session_data = {
                "_key": session_id,
                "id": session_id,
                "participant_id": job_id,
                "session_type": session_type,
                "start_time": datetime.now().isoformat(),
                "end_time": datetime.now().isoformat(),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }

            try:
                sessions_collection = client.db.collection("participant_sessions")
                sessions_collection.insert(session_data)
                print(f"✓ Created session {session_type} for participant: {job_id}")
            except Exception as e:
                print(f"✗ Failed to create session for {job_id}: {e}")

    client.close()
    print("Hume AI participants import completed!")

if __name__ == "__main__":
    import_hume_participants()
