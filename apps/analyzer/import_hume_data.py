#!/usr/bin/env python3
"""
Script to import Hume AI analysis data into Supabase database.
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
SUPABASE_KEY = "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"

def get_supabase_client() -> Client:
    """Get Supabase client instance."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def get_participant_session(participant_id: str, session_type: str, supabase: Client):
    """Get experiment session ID for a participant and session type."""
    try:
        result = supabase.table("participant_experiment_sessions").select("id").eq("participant_id", participant_id).eq("session_type", session_type).execute()
        if result.data:
            return result.data[0]["id"]

        # If no session found, try session-1
        if session_type != "session-1":
            result = supabase.table("participant_experiment_sessions").select("id").eq("participant_id", participant_id).eq("session_type", "session-1").execute()
            if result.data:
                return result.data[0]["id"]

    except Exception as e:
        print(f"  ✗ Failed to get session for {participant_id} {session_type}: {e}")
    return None

def process_hume_job(hume_dir: str, supabase: Client):
    """Process a single Hume AI analysis job."""
    dir_name = os.path.basename(hume_dir)
    participant_id = dir_name.replace("HumeAI_artifacts_", "").split("_")[0]

    # Find JSON file
    json_files = glob.glob(os.path.join(hume_dir, "HumeAI_predictions_*.json"))
    if not json_files:
        print(f"  ✗ No JSON file found in {hume_dir}")
        return

    json_file = json_files[0]
    job_id = str(uuid.uuid4())

    # Determine session type from registry files
    registry_files = glob.glob(os.path.join(hume_dir, "registry_file-*"))
    session_type = "session-1"  # Default
    if len(registry_files) > 1:
        session_type = "session-2"  # If multiple registry files, assume session-2

    # Get experiment session ID (try both session types if needed)
    experiment_session_id = get_participant_session(participant_id, session_type, supabase)
    if not experiment_session_id:
        print(f"  ✗ No experiment session found for {participant_id}, skipping...")
        return

    # Create job record
    job_data = {
        "id": job_id,
        "participant_experiment_session_id": experiment_session_id,
        "source_media_path": f"apps/analyzer/data/{participant_id}/session-{session_type[-1]}-video.webm",
        "hume_job_id": job_id,  # Using our UUID as Hume job ID
        "status": "completed",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

    try:
        supabase.table("participant_hume_analysis_jobs").upsert(job_data).execute()
        print(f"  ✓ Created Hume job {job_id} for {participant_id} {session_type}")
    except Exception as e:
        print(f"  ✗ Failed to create Hume job for {participant_id}: {e}")
        return

    # Process the JSON file to extract predictions
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            hume_data = json.load(f)

        process_hume_predictions(job_id, hume_data, supabase)

    except Exception as e:
        print(f"  ✗ Failed to process Hume JSON {json_file}: {e}")

def process_hume_predictions(job_id: str, hume_data: list, supabase: Client):
    """Process Hume AI predictions from JSON data."""
    try:
        for item in hume_data:
            if "results" in item and "predictions" in item["results"]:
                predictions = item["results"]["predictions"]

                for pred in predictions:
                    if "models" in pred:
                        models = pred["models"]

                        # Process language predictions
                        if "language" in models and "grouped_predictions" in models["language"]:
                            for group in models["language"]["grouped_predictions"]:
                                if "predictions" in group:
                                    for lang_pred in group["predictions"]:
                                        process_language_prediction(job_id, lang_pred, supabase)

                        # Process burst predictions
                        if "burst" in models and "predictions" in models["burst"]:
                            for burst_pred in models["burst"]["predictions"]:
                                process_burst_prediction(job_id, burst_pred, supabase)

                        # Process prosody predictions
                        if "prosody" in models and "predictions" in models["prosody"]:
                            for prosody_pred in models["prosody"]["predictions"]:
                                process_prosody_prediction(job_id, prosody_pred, supabase)

    except Exception as e:
        print(f"  ✗ Failed to process predictions for job {job_id}: {e}")

def process_language_prediction(job_id: str, prediction: dict, supabase: Client):
    """Process a single language prediction."""
    try:
        time_data = prediction.get("time", {})
        begin_time = time_data.get("begin", 0)
        end_time = time_data.get("end", 0)

        lang_data = {
            "id": str(uuid.uuid4()),
            "job_id": job_id,
            "text": prediction.get("text", ""),
            "begin_time": begin_time,
            "end_time": end_time,
            "confidence": prediction.get("confidence"),
            "speaker_confidence": prediction.get("speaker_confidence"),
            "emotions": prediction.get("emotions", []),
            "toxicity": prediction.get("toxicity", []),
            "created_at": datetime.now().isoformat()
        }

        supabase.table("participant_hume_language_predictions").insert(lang_data).execute()

    except Exception as e:
        print(f"  ✗ Failed to insert language prediction: {e}")

def process_burst_prediction(job_id: str, prediction: dict, supabase: Client):
    """Process a single burst prediction."""
    try:
        time_data = prediction.get("time", {})
        begin_time = time_data.get("begin", 0)
        end_time = time_data.get("end", 0)

        burst_data = {
            "id": str(uuid.uuid4()),
            "job_id": job_id,
            "begin_time": begin_time,
            "end_time": end_time,
            "emotions": prediction.get("emotions", []),
            "expressions": prediction.get("expressions", []),
            "created_at": datetime.now().isoformat()
        }

        supabase.table("participant_hume_burst_predictions").insert(burst_data).execute()

    except Exception as e:
        print(f"  ✗ Failed to insert burst prediction: {e}")

def process_prosody_prediction(job_id: str, prediction: dict, supabase: Client):
    """Process a single prosody prediction."""
    try:
        time_data = prediction.get("time", {})
        begin_time = time_data.get("begin", 0)
        end_time = time_data.get("end", 0)

        prosody_data = {
            "id": str(uuid.uuid4()),
            "job_id": job_id,
            "begin_time": begin_time,
            "end_time": end_time,
            "confidence": prediction.get("confidence"),
            "features": prediction.get("features", {}),
            "emotions": prediction.get("emotions", []),
            "created_at": datetime.now().isoformat()
        }

        supabase.table("participant_hume_prosody_predictions").insert(prosody_data).execute()

    except Exception as e:
        print(f"  ✗ Failed to insert prosody prediction: {e}")

def main():
    """Main import function."""
    hume_data_dir = "hume_data"
    supabase = get_supabase_client()

    # Get all Hume artifact directories
    hume_dirs = [d for d in os.listdir(hume_data_dir) if os.path.isdir(os.path.join(hume_data_dir, d)) and d.startswith("HumeAI_artifacts_")]

    print(f"Found {len(hume_dirs)} Hume AI analysis directories to process")

    for hume_dir in hume_dirs:
        full_path = os.path.join(hume_data_dir, hume_dir)
        process_hume_job(full_path, supabase)

    print("Hume AI data import completed!")

if __name__ == "__main__":
    main()
