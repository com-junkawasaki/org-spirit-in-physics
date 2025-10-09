#!/usr/bin/env python3
"""
Script to import response data from analysis_results.json into Supabase database.
"""

import os
import json
import uuid
from datetime import datetime
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "http://127.0.0.1:54321"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8HdqQwv8Hdp7fsn3W0YpN81IU"

def get_supabase_client() -> Client:
    """Get Supabase client instance."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def get_participant_sessions(participant_id: str, supabase: Client):
    """Get all experiment sessions for a participant."""
    try:
        result = supabase.table("participant_experiment_sessions").select("id,session_type").eq("participant_id", participant_id).execute()
        return result.data if result.data else []
    except Exception as e:
        print(f"  ✗ Failed to get sessions for {participant_id}: {e}")
        return []

def import_response_data():
    """Import response data from analysis_results.json."""
    supabase = get_supabase_client()

    # Load analysis results
    with open("results/analysis_results.json", "r", encoding="utf-8") as f:
        analysis_data = json.load(f)

    total_imported = 0

    for participant_id, participant_data in analysis_data.items():
        print(f"Processing participant: {participant_id}")

        # Get participant's experiment sessions
        sessions = get_participant_sessions(participant_id, supabase)
        if not sessions:
            print(f"  ✗ No sessions found for participant {participant_id}")
            continue

        # Process each result
        for result in participant_data["results"]:
            # Create response data record
            response_data = {
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
                    supabase.table("word_stimuli").upsert({"id": hash(word) % 1000000, "word": word}).execute()
                    response_data["word_stimulus_id"] = hash(word) % 1000000
                except Exception as e:
                    print(f"  ✗ Failed to upsert word stimulus {word}: {e}")

            # Insert response data
            try:
                supabase.table("participant_response_data").upsert(response_data).execute()
                total_imported += 1
                print(f"  ✓ Imported response: {result['stimulus_word']} -> {result['response_word']}")
            except Exception as e:
                print(f"  ✗ Failed to insert response for {participant_id}: {e}")

    print(f"\nImport completed! Total responses imported: {total_imported}")

if __name__ == "__main__":
    import_response_data()
