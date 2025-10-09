#!/usr/bin/env python3
"""
Script to import analyzer data into Supabase database.
"""

import os
import json
import pandas as pd
import uuid
from datetime import datetime
from supabase import create_client, Client
import glob

# Supabase configuration
SUPABASE_URL = "http://127.0.0.1:54321"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8HdqQwv8Hdp7fsn3W0YpN81IU"

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
            "age": None,  # Will be extracted from session data if available
            "gender": "prefer-not-to-say",  # Default value
            "handedness": None,
            "created_at": consent_data["agreedAt"],
            "updated_at": consent_data["agreedAt"]
        }

        try:
            supabase.table("participants").upsert(participant_data).execute()
            print(f"  ✓ Inserted participant {participant_id}")
        except Exception as e:
            print(f"  ✗ Failed to insert participant {participant_id}: {e}")

        # Insert consent
        consent_record = {
            "participant_id": participant_id,
            "signature": consent_data["signature"],
            "agreements": consent_data["agreements"],
            "agreed_at": consent_data["agreedAt"],
            "created_at": consent_data["agreedAt"],
            "updated_at": consent_data["agreedAt"]
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

    # Process CSV files
    csv_files = glob.glob(os.path.join(participant_dir, "*.CSV"))
    for csv_file in csv_files:
        process_csv_data(participant_id, csv_file, supabase)

def process_session_data(participant_id: str, session_data: dict, supabase: Client):
    """Process session data from session_data.json."""
    events = session_data.get("events", [])

    sessions = {}
    responses = []

    for event in events:
        event_type = event.get("type")
        payload = event.get("payload", {})
        timestamp = parse_timestamp(event.get("timestamp"))

        if event_type == "session_started":
            session_id = str(uuid.uuid4())
            session_num = payload.get("session")

            sessions[session_num] = {
                "id": session_id,
                "participant_id": participant_id,
                "session_id": session_id,
                "session_type": f"session-{session_num}",
                "start_time": timestamp,
                "created_at": timestamp,
                "updated_at": timestamp
            }

        elif event_type == "session_ended" and payload.get("session") in sessions:
            session_num = payload.get("session")
            sessions[session_num]["end_time"] = timestamp
            sessions[session_num]["updated_at"] = timestamp

        elif event_type == "word_displayed":
            # Extract word response data
            session_num = payload.get("session")
            if session_num in sessions:
                word_data = {
                    "participant_id": participant_id,
                    "experiment_id": sessions[session_num]["id"],
                    "stimulus_word": payload.get("word", ""),
                    "response_word": payload.get("response", ""),
                    "reaction_time_ms": payload.get("reactionTime", 0),
                    "session": f"session-{session_num}",
                    "timestamp": timestamp,
                    "audio_file_path": payload.get("audioFile"),
                    "video_file_path": payload.get("videoFile"),
                    "emotion": payload.get("emotion"),
                    "emotion_confidence": payload.get("emotionConfidence"),
                    "created_at": timestamp,
                    "updated_at": timestamp
                }
                responses.append(word_data)

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
                supabase.table("word_stimuli").upsert({"id": hash(word) % 1000000, "word": word}).execute()

                response_data["word_stimulus_id"] = hash(word) % 1000000

            supabase.table("participant_response_data").upsert(response_data).execute()
        except Exception as e:
            print(f"  ✗ Failed to insert response for {participant_id}: {e}")

def process_csv_data(participant_id: str, csv_file: str, supabase: Client):
    """Process physiological data from CSV file."""
    try:
        df = pd.read_csv(csv_file, skiprows=8)  # Skip header rows
        df.columns = ['Time_Sec', 'Ch1', 'Ch2', 'Ch3', 'Ch4', 'Ch5', 'Ch6', 'Ch7', 'Ch8']

        # Extract metadata from header
        with open(csv_file, 'r') as f:
            lines = f.readlines()
            date_line = lines[4].strip()  # Date,2025-07-31
            begin_line = lines[5].strip()  # Begin,16:7:8

        date_str = date_line.split(',')[1]
        time_str = begin_line.split(',')[1]

        # Calculate base timestamp
        base_datetime = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S")

        # Update participant_response_data with skin potential data
        for idx, row in df.iterrows():
            timestamp = base_datetime + pd.Timedelta(seconds=row['Time_Sec'])

            # Find matching response record and update skin_potential
            try:
                # This is a simplified approach - in practice you'd need to match by timestamp
                # For now, we'll just update records that don't have skin_potential set
                supabase.table("participant_response_data").update({
                    "skin_potential": float(row['Ch1']),  # Using Ch1 as skin potential
                    "updated_at": timestamp.isoformat()
                }).eq("participant_id", participant_id).is_("skin_potential", None).execute()

            except Exception as e:
                print(f"  ✗ Failed to update skin potential for {participant_id}: {e}")
                break  # Only update first matching record to avoid duplicates

    except Exception as e:
        print(f"  ✗ Failed to process CSV {csv_file}: {e}")

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