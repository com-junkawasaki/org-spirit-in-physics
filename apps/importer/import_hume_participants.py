#!/usr/bin/env python3
"""
Script to import Hume AI job IDs as participants and create corresponding sessions in TerminusDB.
"""

import os
import json
import uuid
from datetime import datetime
from pathlib import Path
from terminusdb_client import WOQLClient, WOQLQuery

# Load configuration from config.yaml
import yaml
with open('config.yaml') as f:
    config = yaml.safe_load(f)

# TerminusDB configuration
TERMINUSDB_URL = config.get('terminusdb', {}).get('server_url', 'http://localhost:6363')
TERMINUSDB_USER = config.get('terminusdb', {}).get('user', 'admin')
TERMINUSDB_PASSWORD = config.get('terminusdb', {}).get('password', 'root')
DATABASE_ID = config.get('terminusdb', {}).get('database', 'spirit_in_physics')

def get_terminusdb_client() -> WOQLClient:
    """Get TerminusDB client instance."""
    client = WOQLClient(server=TERMINUSDB_URL, user=TERMINUSDB_USER, password=TERMINUSDB_PASSWORD)
    client.connect(DATABASE_ID)
    return client

def import_hume_participants_to_terminusdb():
    """Import Hume AI job IDs as participants and create corresponding sessions in TerminusDB."""

    try:
        # Initialize TerminusDB client
        client = WOQLClient(server=TERMINUSDB_URL, user=TERMINUSDB_USER, password=TERMINUSDB_PASSWORD)

        # Create database if it doesn't exist
        if DATABASE_ID not in client.list_databases():
            client.create_database(DATABASE_ID, "Spirit in Physics Experiment Database")
            print(f"Created database: {DATABASE_ID}")
        else:
            print(f"Database {DATABASE_ID} already exists")

        # Connect to database
        client.connect(DATABASE_ID)

        # Load schema
        schema_path = Path(__file__).parent / "terminusdb_schema.jsonld"
        if schema_path.exists():
            with open(schema_path, 'r') as f:
                schema = json.load(f)

            query = WOQLQuery().insert(schema["@graph"])
            client.query(query)
            print("Schema loaded successfully")
        else:
            print(f"Warning: Schema file not found at {schema_path}")

        hume_data_dir = "hume_data"

        # Get Hume AI job IDs
        if not os.path.exists(hume_data_dir):
            print(f"Hume data directory {hume_data_dir} not found")
            return

        hume_dirs = [d for d in os.listdir(hume_data_dir) if d.startswith('HumeAI_artifacts_')]
        hume_job_ids = [d.replace('HumeAI_artifacts_', '') for d in hume_dirs]

        print(f"Found {len(hume_job_ids)} Hume AI jobs")

        current_time = datetime.now().isoformat()

        # Import participants and sessions
        for job_id in hume_job_ids:
            # Create participant
            participant_iri = f"terminusdb:///data/Participant/{job_id}"
            participant_data = {
                "@type": "Participant",
                "@id": participant_iri,
                "id": job_id,
                "age": None,
                "gender": "prefer-not-to-say",
                "handedness": None,
                "created_at": current_time,
                "updated_at": current_time
            }

            try:
                query = WOQLQuery().insert(participant_data)
                client.query(query)
                print(f"  ✓ Inserted participant {job_id}")
            except Exception as e:
                print(f"  ✗ Failed to insert participant {job_id}: {e}")

            # Check if Hume directory has registry_file-1 (session-2) or not
            hume_dir = f"HumeAI_artifacts_{job_id}"
            registry_files = [f for f in os.listdir(os.path.join(hume_data_dir, hume_dir)) if f.startswith('registry_file-')]

            sessions_to_create = []
            if len(registry_files) >= 1:
                sessions_to_create.append('session-1')
            if len(registry_files) >= 2:
                sessions_to_create.append('session-2')

            # Create experiment sessions
            for session_type in sessions_to_create:
                session_id = str(uuid.uuid4())
                session_iri = f"terminusdb:///data/ExperimentSession/{session_id}"
                session_data = {
                    "@type": "ExperimentSession",
                    "@id": session_iri,
                    "id": session_id,
                    "session_type": session_type,
                    "start_time": current_time,
                    "created_at": current_time,
                    "updated_at": current_time,
                    "belongs_to_participant": participant_iri
                }

                try:
                    query = WOQLQuery().woql_and(
                        WOQLQuery().insert(session_data),
                        WOQLQuery().link(participant_iri, "has_session", session_iri)
                    )
                    client.query(query)
                    print(f"  ✓ Inserted session {session_type} for {job_id}")
                except Exception as e:
                    print(f"  ✗ Failed to insert session {session_type} for {job_id}: {e}")

        print("Import completed successfully!")

    except Exception as e:
        print(f"Import failed: {e}")
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    import_hume_participants_to_terminusdb()
