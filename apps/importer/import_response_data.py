#!/usr/bin/env python3
"""
Script to import response data from analysis_results.json into ArangoDB database.
"""

import os
import json
import uuid
from datetime import datetime
from arangodb_client import ArangoDBClient
import yaml

def get_arangodb_client() -> ArangoDBClient:
    """Get ArangoDB client instance."""
    with open('config.yaml') as f:
        config = yaml.safe_load(f)

    client = ArangoDBClient(
        config['arangodb']['url'],
        config['arangodb']['user'],
        config['arangodb']['password']
    )
    return client

def get_participant_sessions(participant_id: str, client: ArangoDBClient):
    """Get all experiment sessions for a participant."""
    try:
        aql = """
        FOR s IN participant_sessions
        FILTER s.participant_id == @participant_id
        RETURN {id: s.id, session_type: s.session_type}
        """
        cursor = client.db.aql.execute(aql, bind_vars={"participant_id": participant_id})
        return [doc for doc in cursor]
    except Exception as e:
        print(f"  ✗ Failed to get sessions for {participant_id}: {e}")
        return []

def import_response_data():
    """Import response data from analysis_results.json."""
    client = get_arangodb_client()

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

    # Load analysis results
    results_file = "results/analysis_results.json"
    if not os.path.exists(results_file):
        print(f"Analysis results file not found: {results_file}")
        client.close()
        return

    with open(results_file, "r", encoding="utf-8") as f:
        analysis_data = json.load(f)

    total_imported = 0

    for participant_id, participant_data in analysis_data.items():
        print(f"Processing participant: {participant_id}")

        # Get participant's experiment sessions
        sessions = get_participant_sessions(participant_id, client)
        if not sessions:
            print(f"  ✗ No sessions found for participant {participant_id}")
            continue

        # Process each result
        for result in participant_data["results"]:
            # Create response data record
            response_data = {
                "_key": str(uuid.uuid4()),
                "id": str(uuid.uuid4()),
                "participant_id": participant_id,
                "experiment_id": sessions[0]["id"],  # Use first session for now
                "stimulus_word": result["stimulus_word"],
                "response_word": result["response_word"],
                "reaction_time_ms": result["reaction_time_ms"],
                "session": sessions[0]["session_type"],
                "timestamp": datetime.now().isoformat(),
                "emotion": None,  # Will be updated from Hume data if available
                "emotion_confidence": None,
                "skin_potential": result["components"].get("skin_potential"),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }

            # Ensure word_stimulus exists
            word = result["stimulus_word"]
            if word:
                try:
                    word_stimulus_id = str(hash(word) % 1000000)
                    stimulus_data = {
                        "_key": word_stimulus_id,
                        "id": word_stimulus_id,
                        "word": word,
                        "created_at": datetime.now().isoformat()
                    }
                    stimuli_collection = client.db.collection("word_stimuli")
                    stimuli_collection.insert(stimulus_data, overwrite=True)
                    response_data["word_stimulus_id"] = word_stimulus_id
                except Exception as e:
                    print(f"  ✗ Failed to upsert word stimulus {word}: {e}")

            # Insert response data
            try:
                responses_collection = client.db.collection("participant_session_responses")
                responses_collection.insert(response_data)
                total_imported += 1
                print(f"  ✓ Imported response: {result['stimulus_word']} -> {result['response_word']}")
            except Exception as e:
                print(f"  ✗ Failed to insert response for {participant_id}: {e}")

    client.close()
    print(f"\nImport completed! Total responses imported: {total_imported}")

if __name__ == "__main__":
    import_response_data()
