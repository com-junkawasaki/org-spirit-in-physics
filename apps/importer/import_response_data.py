#!/usr/bin/env python3
"""
Script to import response data from analysis_results.json into TerminusDB database.
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

def get_participant_sessions(participant_id: str, client: WOQLClient):
    """Get all experiment sessions for a participant."""
    try:
        participant_iri = f"terminusdb:///data/Participant/{participant_id}"
        query = WOQLQuery().woql_and(
            WOQLQuery().triple(participant_iri, "has_session", "v:Session"),
            WOQLQuery().triple("v:Session", "rdf:type", "scm:ExperimentSession"),
            WOQLQuery().triple("v:Session", "scm:id", "v:SessionId"),
            WOQLQuery().triple("v:Session", "scm:session_type", "v:SessionType")
        )

        result = client.query(query)
        sessions = []
        if result.get("bindings"):
            for binding in result["bindings"]:
                sessions.append({
                    "id": binding["SessionId"]["@value"],
                    "session_type": binding["SessionType"]["@value"]
                })
        return sessions
    except Exception as e:
        print(f"  ✗ Failed to get sessions for {participant_id}: {e}")
        return []

def import_response_data():
    """Import response data from analysis_results.json into TerminusDB."""

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

        # Load analysis results
        results_path = "results/analysis_results.json"
        if not os.path.exists(results_path):
            print(f"Analysis results file not found: {results_path}")
            return

        with open(results_path, "r", encoding="utf-8") as f:
            analysis_data = json.load(f)

        total_imported = 0
        current_time = datetime.now().isoformat()

        for participant_id, participant_data in analysis_data.items():
            print(f"Processing participant: {participant_id}")

            # Get participant's experiment sessions
            sessions = get_participant_sessions(participant_id, client)
            if not sessions:
                print(f"  ✗ No sessions found for participant {participant_id}")
                continue

            participant_iri = f"terminusdb:///data/Participant/{participant_id}"

            # Process each result
            for result in participant_data["results"]:
                # Create word stimulus if it doesn't exist
                word = result["stimulus_word"]
                word_stimulus_iri = None
                if word:
                    word_stimulus_id = hash(word) % 2147483647
                    word_stimulus_iri = f"terminusdb:///data/WordStimulus/{word_stimulus_id}"
                    word_stimulus_data = {
                        "@type": "WordStimulus",
                        "@id": word_stimulus_iri,
                        "id": str(word_stimulus_id),
                        "word": word,
                        "created_at": current_time
                    }

                    try:
                        query = WOQLQuery().insert(word_stimulus_data)
                        client.query(query)
                        print(f"  ✓ Inserted/updated word stimulus: {word}")
                    except Exception as e:
                        print(f"  ✗ Failed to upsert word stimulus {word}: {e}")

                # Create response data record
                response_id = str(uuid.uuid4())
                response_iri = f"terminusdb:///data/ResponseData/{response_id}"
                session_iri = f"terminusdb:///data/ExperimentSession/{sessions[0]['id']}"

                response_data = {
                    "@type": "ResponseData",
                    "@id": response_iri,
                    "id": response_id,
                    "stimulus_word": result["stimulus_word"],
                    "response_word": result["response_word"],
                    "reaction_time_ms": result["reaction_time_ms"],
                    "timestamp": current_time,
                    "emotion": None,  # Will be updated from Hume data if available
                    "emotion_confidence": None,
                    "skin_potential": result["components"].get("skin_potential"),
                    "created_at": current_time,
                    "updated_at": current_time,
                    "belongs_to_participant": participant_iri,
                    "belongs_to_session": session_iri
                }

                # Add word stimulus reference if available
                if word_stimulus_iri:
                    response_data["uses_stimulus"] = word_stimulus_iri

                # Remove None values
                response_data = {k: v for k, v in response_data.items() if v is not None}

                # Insert response data
                try:
                    query = WOQLQuery().woql_and(
                        WOQLQuery().insert(response_data),
                        WOQLQuery().link(participant_iri, "has_response", response_iri)
                    )
                    client.query(query)
                    total_imported += 1
                    print(f"  ✓ Imported response: {result['stimulus_word']} -> {result['response_word']}")
                except Exception as e:
                    print(f"  ✗ Failed to insert response for {participant_id}: {e}")

        print(f"\nImport completed! Total responses imported: {total_imported}")

    except Exception as e:
        print(f"Import failed: {e}")
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    import_response_data()
