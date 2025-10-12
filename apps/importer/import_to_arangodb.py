#!/usr/bin/env python3
"""
Script to import analyzer data into ArangoDB database.
"""

import os
import json
import pandas as pd
import uuid
from datetime import datetime
from pathlib import Path
import glob
from packages.spirit_in_physics_pipeline.arangodb_client import ArangoDBClient

# Load configuration from config.yaml
import yaml
with open('config.yaml') as f:
    config = yaml.safe_load(f)

# ArangoDB configuration
ARANGODB_URL = config.get('arangodb', {}).get('url', 'http://localhost:8529')
ARANGODB_USER = config.get('arangodb', {}).get('user', 'root')
ARANGODB_PASSWORD = config.get('arangodb', {}).get('password', '')
DATABASE_NAME = config.get('arangodb', {}).get('database', 'spirit_in_physics')

def get_arangodb_client() -> ArangoDBClient:
    """Get ArangoDB client instance."""
    client = ArangoDBClient(ARANGODB_URL, ARANGODB_USER, ARANGODB_PASSWORD)
    return client

def parse_timestamp(ts: int) -> str:
    """Convert Unix timestamp to ISO format."""
    return datetime.fromtimestamp(ts / 1000).isoformat()

def process_participant_data(participant_dir: str, client: ArangoDBClient):
    """Process data for a single participant."""
    participant_id = os.path.basename(participant_dir)

    print(f"Processing participant: {participant_id}")

    # Process consent.json
    consent_file = os.path.join(participant_dir, "consent.json")
    if os.path.exists(consent_file):
        with open(consent_file, 'r', encoding='utf-8') as f:
            consent_data = json.load(f)

        # Insert participant
        participant_data = {
            "id": participant_id,
            "age": None,  # Will be extracted from session data if available
            "gender": "prefer-not-to-say",  # Default value
            "handedness": None,
            "created_at": consent_data["agreedAt"],
            "updated_at": consent_data["agreedAt"]
        }

        success = client.insert_participant(participant_data)
        if not success:
            print(f"Failed to insert participant {participant_id}")
            return

        # Process session data
        session_files = glob.glob(os.path.join(participant_dir, "session_*.json"))
        for session_file in session_files:
            with open(session_file, 'r', encoding='utf-8') as f:
                session_data = json.load(f)

            # Extract participant demographics if available
            if "age" in session_data and session_data["age"]:
                participant_data["age"] = session_data["age"]
            if "gender" in session_data and session_data["gender"]:
                participant_data["gender"] = session_data["gender"]
            if "handedness" in session_data and session_data["handedness"]:
                participant_data["handedness"] = session_data["handedness"]

            # Insert session
            session_doc = {
                "id": session_data.get("sessionId", f"{participant_id}_{os.path.basename(session_file).replace('session_', '').replace('.json', '')}"),
                "participant_id": participant_id,
                "session_type": session_data.get("sessionType", "word_association"),
                "start_time": session_data.get("startTime"),
                "end_time": session_data.get("endTime"),
                "created_at": session_data.get("startTime"),
                "updated_at": session_data.get("endTime", session_data.get("startTime"))
            }

            success = client.insert_session(session_doc)
            if not success:
                print(f"Failed to insert session {session_doc['id']}")
                continue

            # Process response data
            responses = session_data.get("responses", [])
            for response in responses:
                response_doc = {
                    "id": str(uuid.uuid4()),
                    "participant_id": participant_id,
                    "experiment_id": session_doc["id"],
                    "word_stimulus_id": response.get("stimulusId"),
                    "stimulus_word": response.get("stimulusWord"),
                    "response_word": response.get("responseWord"),
                    "reaction_time_ms": response.get("reactionTime"),
                    "timestamp": response.get("timestamp"),
                    "audio_file_path": response.get("audioFile"),
                    "video_file_path": response.get("videoFile"),
                    "skin_potential": response.get("skinPotential"),
                    "emotion": response.get("emotion"),
                    "emotion_confidence": response.get("emotionConfidence"),
                    "created_at": response.get("timestamp"),
                    "updated_at": response.get("timestamp")
                }

                success = client.insert_response_data(response_doc)
                if not success:
                    print(f"Failed to insert response data")

        # Update participant with extracted demographics
        client.insert_participant(participant_data)

        # Process word stimuli
        word_stimuli = set()
        for session_file in session_files:
            with open(session_file, 'r', encoding='utf-8') as f:
                session_data = json.load(f)
                for response in session_data.get("responses", []):
                    stimulus_word = response.get("stimulusWord")
                    if stimulus_word:
                        word_stimuli.add(stimulus_word)

        for stimulus_word in word_stimuli:
            stimulus_doc = {
                "id": str(uuid.uuid4()),
                "word": stimulus_word,
                "created_at": datetime.now().isoformat()
            }
            client.insert_word_stimulus(stimulus_doc)

def import_participants_data(participants_dir: str, client: ArangoDBClient):
    """Import all participant data from the dataset directory."""
    if not os.path.exists(participants_dir):
        print(f"Participants directory not found: {participants_dir}")
        return

    participant_dirs = [d for d in os.listdir(participants_dir) if os.path.isdir(os.path.join(participants_dir, d))]

    for participant_dir in participant_dirs:
        full_path = os.path.join(participants_dir, participant_dir)
        process_participant_data(full_path, client)

def main():
    """Main import function."""
    print("Starting ArangoDB import process...")

    # Initialize ArangoDB client
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

    # Import participants data
    participants_dir = "../../dataset/participants"
    import_participants_data(participants_dir, client)

    # Close connection
    client.close()

    print("ArangoDB import process completed!")

if __name__ == "__main__":
    main()
