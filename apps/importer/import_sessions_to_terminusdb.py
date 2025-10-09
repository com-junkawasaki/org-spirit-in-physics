#!/usr/bin/env python3
"""
Script to import session data from import_sessions_fixed.sql into TerminusDB.
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

def parse_session_insert(sql_line: str) -> dict:
    """Parse a session INSERT statement and return session data."""
    # Extract VALUES part
    values_start = sql_line.find("VALUES (") + 8
    values_end = sql_line.find(")", values_start)
    values_str = sql_line[values_start:values_end]

    # Split by comma and clean up
    values = [v.strip().strip("'") for v in values_str.split(",")]

    return {
        "id": values[0],
        "participant_id": values[1],
        "session_id": values[2],
        "session_type": values[3],
        "start_time": values[4],
        "end_time": values[5] if values[5] != "NULL" else None,
        "created_at": values[6],
        "updated_at": values[7]
    }

def import_sessions_to_terminusdb():
    """Import session data from SQL file to TerminusDB."""

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

        # Read SQL file
        sql_file = "import_sessions_fixed.sql"
        if not os.path.exists(sql_file):
            print(f"SQL file {sql_file} not found")
            return

        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()

        # Parse INSERT statements
        lines = sql_content.split('\n')
        sessions_data = []

        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if line.startswith("INSERT INTO participant_experiment_sessions"):
                # Collect multi-line INSERT statement
                insert_sql = line
                i += 1
                while i < len(lines) and not lines[i].strip().startswith("INSERT INTO") and lines[i].strip():
                    insert_sql += " " + lines[i].strip()
                    i += 1

                # Parse the session data
                try:
                    session_data = parse_session_insert(insert_sql)
                    sessions_data.append(session_data)
                    print(f"Parsed session: {session_data['participant_id']} - {session_data['session_type']}")
                except Exception as e:
                    print(f"Failed to parse INSERT statement: {e}")
                    print(f"Statement: {insert_sql[:100]}...")
            else:
                i += 1

        print(f"Found {len(sessions_data)} session records to import")

        # Import sessions to TerminusDB
        for session_data in sessions_data:
            # Create session IRI
            session_iri = f"terminusdb:///data/ExperimentSession/{session_data['id']}"
            participant_iri = f"terminusdb:///data/Participant/{session_data['participant_id']}"

            session_doc = {
                "@type": "ExperimentSession",
                "@id": session_iri,
                "id": session_data["id"],
                "session_type": session_data["session_type"],
                "start_time": session_data["start_time"],
                "created_at": session_data["created_at"],
                "updated_at": session_data["updated_at"],
                "belongs_to_participant": participant_iri
            }

            # Add end_time if it exists
            if session_data["end_time"]:
                session_doc["end_time"] = session_data["end_time"]

            # Remove None values
            session_doc = {k: v for k, v in session_doc.items() if v is not None}

            try:
                query = WOQLQuery().woql_and(
                    WOQLQuery().insert(session_doc),
                    WOQLQuery().link(participant_iri, "has_session", session_iri)
                )
                client.query(query)
                print(f"  ✓ Imported session {session_data['session_type']} for {session_data['participant_id']}")
            except Exception as e:
                print(f"  ✗ Failed to import session {session_data['id']}: {e}")

        print("Session import completed successfully!")

    except Exception as e:
        print(f"Import failed: {e}")
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    import_sessions_to_terminusdb()
