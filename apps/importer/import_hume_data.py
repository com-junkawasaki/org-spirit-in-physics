#!/usr/bin/env python3
"""
Script to import Hume AI analysis data into TerminusDB database.
"""

import os
import json
import pandas as pd
import uuid
from datetime import datetime
from pathlib import Path
from terminusdb_client import WOQLClient, WOQLQuery
import glob

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

def get_participant_session(participant_id: str, session_type: str, client: WOQLClient):
    """Get experiment session ID for a participant and session type."""
    try:
        participant_iri = f"terminusdb:///data/Participant/{participant_id}"
        query = WOQLQuery().woql_and(
            WOQLQuery().triple(participant_iri, "has_session", "v:Session"),
            WOQLQuery().triple("v:Session", "rdf:type", "scm:ExperimentSession"),
            WOQLQuery().triple("v:Session", "scm:session_type", session_type),
            WOQLQuery().triple("v:Session", "scm:id", "v:SessionId")
        )

        result = client.query(query)
        if result.get("bindings"):
            return result["bindings"][0]["SessionId"]["@value"]

        # If no session found, try session-1
        if session_type != "session-1":
            query = WOQLQuery().woql_and(
                WOQLQuery().triple(participant_iri, "has_session", "v:Session"),
                WOQLQuery().triple("v:Session", "rdf:type", "scm:ExperimentSession"),
                WOQLQuery().triple("v:Session", "scm:session_type", "session-1"),
                WOQLQuery().triple("v:Session", "scm:id", "v:SessionId")
            )
            result = client.query(query)
            if result.get("bindings"):
                return result["bindings"][0]["SessionId"]["@value"]

    except Exception as e:
        print(f"  ✗ Failed to get session for {participant_id} {session_type}: {e}")
    return None

def process_hume_job(hume_dir: str, client: WOQLClient):
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
    experiment_session_id = get_participant_session(participant_id, session_type, client)
    if not experiment_session_id:
        print(f"  ✗ No experiment session found for {participant_id}, skipping...")
        return

    # Create job record
    job_iri = f"terminusdb:///data/HumeAnalysisJob/{job_id}"
    session_iri = f"terminusdb:///data/ExperimentSession/{experiment_session_id}"
    job_data = {
        "@type": "HumeAnalysisJob",
        "@id": job_iri,
        "id": job_id,
        "belongs_to_session": session_iri,
        "source_media_path": f"apps/analyzer/data/{participant_id}/session-{session_type[-1]}-video.webm",
        "hume_job_id": job_id,  # Using our UUID as Hume job ID
        "status": "completed",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

    try:
        query = WOQLQuery().woql_and(
            WOQLQuery().insert(job_data),
            WOQLQuery().link(session_iri, "has_hume_analysis", job_iri)
        )
        client.query(query)
        print(f"  ✓ Created Hume job {job_id} for {participant_id} {session_type}")
    except Exception as e:
        print(f"  ✗ Failed to create Hume job for {participant_id}: {e}")
        return

    # Process the JSON file to extract predictions
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            hume_data = json.load(f)

        process_hume_predictions(job_id, hume_data, client)

    except Exception as e:
        print(f"  ✗ Failed to process Hume JSON {json_file}: {e}")

def process_hume_predictions(job_id: str, hume_data: list, client: WOQLClient):
    """Process Hume AI predictions from JSON data."""
    try:
        job_iri = f"terminusdb:///data/HumeAnalysisJob/{job_id}"

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
                                        process_language_prediction(job_id, lang_pred, client)

                        # Process burst predictions
                        if "burst" in models and "grouped_predictions" in models["burst"]:
                            for group in models["burst"]["grouped_predictions"]:
                                if "predictions" in group:
                                    for burst_pred in group["predictions"]:
                                        process_burst_prediction(job_id, burst_pred, client)

                        # Process prosody predictions
                        if "prosody" in models and "grouped_predictions" in models["prosody"]:
                            for group in models["prosody"]["grouped_predictions"]:
                                if "predictions" in group:
                                    for prosody_pred in group["predictions"]:
                                        process_prosody_prediction(job_id, prosody_pred, client)

    except Exception as e:
        print(f"  ✗ Failed to process predictions for job {job_id}: {e}")

def process_language_prediction(job_id: str, prediction: dict, client: WOQLClient):
    """Process a single language prediction."""
    try:
        time_data = prediction.get("time", {})
        begin_time = time_data.get("begin", 0)
        end_time = time_data.get("end", 0)

        prediction_id = str(uuid.uuid4())
        prediction_iri = f"terminusdb:///data/HumeLanguagePrediction/{prediction_id}"
        job_iri = f"terminusdb:///data/HumeAnalysisJob/{job_id}"

        lang_data = {
            "@type": "HumeLanguagePrediction",
            "@id": prediction_iri,
            "id": prediction_id,
            "belongs_to_job": job_iri,
            "text": prediction.get("text", ""),
            "begin_time": begin_time,
            "end_time": end_time,
            "confidence": prediction.get("confidence"),
            "speaker_confidence": prediction.get("speaker_confidence"),
            "emotions": json.dumps(prediction.get("emotions", [])),
            "toxicity": json.dumps(prediction.get("toxicity", [])),
            "created_at": datetime.now().isoformat()
        }

        # Remove None values
        lang_data = {k: v for k, v in lang_data.items() if v is not None}

        query = WOQLQuery().woql_and(
            WOQLQuery().insert(lang_data),
            WOQLQuery().link(job_iri, "has_language_prediction", prediction_iri)
        )
        client.query(query)

    except Exception as e:
        print(f"  ✗ Failed to insert language prediction: {e}")

def process_burst_prediction(job_id: str, prediction: dict, client: WOQLClient):
    """Process a single burst prediction."""
    try:
        time_data = prediction.get("time", {})
        begin_time = time_data.get("begin", 0)
        end_time = time_data.get("end", 0)

        prediction_id = str(uuid.uuid4())
        prediction_iri = f"terminusdb:///data/HumeBurstPrediction/{prediction_id}"
        job_iri = f"terminusdb:///data/HumeAnalysisJob/{job_id}"

        burst_data = {
            "@type": "HumeBurstPrediction",
            "@id": prediction_iri,
            "id": prediction_id,
            "belongs_to_job": job_iri,
            "begin_time": begin_time,
            "end_time": end_time,
            "emotions": json.dumps(prediction.get("emotions", [])),
            "expressions": json.dumps(prediction.get("expressions", [])),
            "created_at": datetime.now().isoformat()
        }

        # Remove None values
        burst_data = {k: v for k, v in burst_data.items() if v is not None}

        query = WOQLQuery().woql_and(
            WOQLQuery().insert(burst_data),
            WOQLQuery().link(job_iri, "has_burst_prediction", prediction_iri)
        )
        client.query(query)

    except Exception as e:
        print(f"  ✗ Failed to insert burst prediction: {e}")

def process_prosody_prediction(job_id: str, prediction: dict, client: WOQLClient):
    """Process a single prosody prediction."""
    try:
        time_data = prediction.get("time", {})
        begin_time = time_data.get("begin", 0)
        end_time = time_data.get("end", 0)

        prediction_id = str(uuid.uuid4())
        prediction_iri = f"terminusdb:///data/HumeProsodyPrediction/{prediction_id}"
        job_iri = f"terminusdb:///data/HumeAnalysisJob/{job_id}"

        prosody_data = {
            "@type": "HumeProsodyPrediction",
            "@id": prediction_iri,
            "id": prediction_id,
            "belongs_to_job": job_iri,
            "begin_time": begin_time,
            "end_time": end_time,
            "confidence": prediction.get("confidence"),
            "features": json.dumps(prediction.get("features", {})),
            "emotions": json.dumps(prediction.get("emotions", [])),
            "created_at": datetime.now().isoformat()
        }

        # Remove None values
        prosody_data = {k: v for k, v in prosody_data.items() if v is not None}

        query = WOQLQuery().woql_and(
            WOQLQuery().insert(prosody_data),
            WOQLQuery().link(job_iri, "has_prosody_prediction", prediction_iri)
        )
        client.query(query)

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
