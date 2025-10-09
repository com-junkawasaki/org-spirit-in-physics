#!/usr/bin/env python3
"""
Simplified script to import analyzer data into Supabase database.
"""

import os
import json
import uuid
from datetime import datetime
from supabase import create_client, Client

# Load configuration from config.yaml
import yaml
with open('config.yaml') as f:
    config = yaml.safe_load(f)

SUPABASE_URL = config['supabase']['url']
SUPABASE_KEY = config['supabase']['service_role_key']

def get_supabase_client() -> Client:
    """Get Supabase client instance."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def parse_timestamp(ts: int) -> str:
    """Convert Unix timestamp to ISO format."""
    return datetime.fromtimestamp(ts / 1000).isoformat()

def process_participant_data(participant_dir: str, supabase: Client):
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
            "name": consent_data.get("name", f"Participant {participant_id[:8]}"),
            "created_at": consent_data["agreedAt"]
        }

        try:
            result = supabase.table("participants").upsert(participant_data).execute()
            print(f"  ✓ Inserted participant {participant_id}")
        except Exception as e:
            print(f"  ✗ Failed to insert participant {participant_id}: {e}")

        # Insert consent
        consent_record = {
            "participant_id": participant_id,
            "consent_given": True,
            "consent_timestamp": consent_data["agreedAt"],
            "created_at": consent_data["agreedAt"]
        }

        try:
            supabase.table("participant_consents").upsert(consent_record).execute()
            print(f"  ✓ Inserted consent for {participant_id}")
        except Exception as e:
            print(f"  ✗ Failed to insert consent for {participant_id}: {e}")

    # Process session_data.json
    session_file = os.path.join(participant_dir, "session_data.json")
    if os.path.exists(session_file):
        with open(session_file, 'r', encoding='utf-8') as f:
            session_data = json.load(f)

        process_session_data(participant_id, session_data, supabase)

def process_session_data(participant_id: str, session_data: dict, supabase: Client):
    """Process session data from session_data.json."""
    events = session_data.get("events", [])

    sessions = {}
    responses = []
    session_counter = 1

    for event in events:
        event_type = event.get("type")
        payload = event.get("payload", {})
        timestamp = parse_timestamp(event.get("timestamp"))

        if event_type == "session_started":
            session_id = str(uuid.uuid4())
            sessions[session_counter] = {
                "id": session_id,
                "participant_id": participant_id,
                "session_id": session_id,
                "session_type": f"session-{session_counter}",
                "start_time": timestamp,
                "created_at": timestamp
            }
            session_counter += 1

        elif event_type == "session_ended" and session_counter - 1 in sessions:
            session_num = session_counter - 1
            if session_num in sessions:
                sessions[session_num]["end_time"] = timestamp

        elif event_type == "word_displayed":
            # Find corresponding speech_detected event
            word_key = payload.get("key")
            if word_key:
                for speech_event in events:
                    if (speech_event.get("type") == "speech_detected" and
                        speech_event.get("payload", {}).get("key") == word_key):
                        speech_payload = speech_event.get("payload", {})
                        speech_timestamp = parse_timestamp(speech_event.get("timestamp"))

                        # Calculate reaction time
                        reaction_time = speech_event.get("timestamp") - event.get("timestamp")

                        word_data = {
                            "id": str(uuid.uuid4()),
                            "participant_id": participant_id,
                            "experiment_id": sessions.get(session_counter - 1, {}).get("id", str(uuid.uuid4())),
                            "stimulus_word": payload.get("word", ""),
                            "response_word": speech_payload.get("word", ""),
                            "reaction_time_ms": reaction_time,
                            "session": f"session-{session_counter - 1}" if session_counter > 1 else "session-1",
                            "timestamp": timestamp,
                            "created_at": timestamp,
                            "skin_potential": 0.0,  # Default value
                            "emotion": "neutral",   # Default value
                            "emotion_confidence": 0.5  # Default value
                        }
                        responses.append(word_data)
                        break

    # Insert sessions
    for session_data in sessions.values():
        try:
            supabase.table("participant_experiment_sessions").upsert(session_data).execute()
            print(f"  ✓ Inserted session {session_data['session_type']} for {participant_id}")
        except Exception as e:
            print(f"  ✗ Failed to insert session for {participant_id}: {e}")

    # Insert responses
    for response_data in responses:
        try:
            # Ensure word_stimulus exists
            word = response_data["stimulus_word"]
            if word:
                # Check if word already exists
                existing_word = supabase.table("word_stimuli").select("id").eq("word", word).execute()
                if existing_word.data:
                    word_stimulus_id = existing_word.data[0]["id"]
                else:
                    # Insert new word stimulus with a simple hash-based ID
                    word_stimulus_id = hash(word) % 2147483647  # Max int value
                    supabase.table("word_stimuli").upsert({"id": word_stimulus_id, "word": word}).execute()

                response_data["word_stimulus_id"] = word_stimulus_id

            supabase.table("participant_response_data").upsert(response_data).execute()
            print(f"  ✓ Inserted response: {response_data['stimulus_word']} -> {response_data['response_word']}")
        except Exception as e:
            print(f"  ✗ Failed to insert response for {participant_id}: {e}")

def main():
    """Main import function."""
    data_dir = "data"
    supabase = get_supabase_client()

    # Get all participant directories
    participant_dirs = [d for d in os.listdir(data_dir) if os.path.isdir(os.path.join(data_dir, d))]

    print(f"Found {len(participant_dirs)} participants to process")

    for participant_dir in participant_dirs:
        full_path = os.path.join(data_dir, participant_dir)
        process_participant_data(full_path, supabase)

    print("Import completed!")

if __name__ == "__main__":
    main()
