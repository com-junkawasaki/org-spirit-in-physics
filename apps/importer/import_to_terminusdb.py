#!/usr/bin/env python3
"""
Script to import analyzer data into TerminusDB database.
"""

import os
import json
import pandas as pd
import uuid
from datetime import datetime
from pathlib import Path
import glob
from terminusdb_client import WOQLClient, WOQLQuery

# Load configuration from config.yaml
import yaml
with open('config.yaml') as f:
    config = yaml.safe_load(f)

# TerminusDB configuration
TERMINUSDB_URL = config.get('terminusdb', {}).get('url', 'http://localhost:6363')
TERMINUSDB_USER = config.get('terminusdb', {}).get('user', 'admin')
TERMINUSDB_PASSWORD = config.get('terminusdb', {}).get('password', 'root')
DATABASE_ID = "spirit_in_physics"

def get_terminusdb_client() -> WOQLClient:
    """Get TerminusDB client instance."""
    client = WOQLClient(server=TERMINUSDB_URL, user=TERMINUSDB_USER, password=TERMINUSDB_PASSWORD)
    client.connect(DATABASE_ID)
    return client

def parse_timestamp(ts: int) -> str:
    """Convert Unix timestamp to ISO format."""
    return datetime.fromtimestamp(ts / 1000).isoformat()

def process_participant_data(participant_dir: str, client: WOQLClient):
    """Process data for a single participant."""
    participant_id = os.path.basename(participant_dir)

    print(f"Processing participant: {participant_id}")

    # Process consent.json
    consent_file = os.path.join(participant_dir, "consent.json")
    if os.path.exists(consent_file):
        with open(consent_file, 'r', encoding='utf-8') as f:
            consent_data = json.load(f)

        # Create participant IRI
        participant_iri = f"terminusdb:///data/Participant/{participant_id}"

        # Insert participant
        participant_data = {
            "@type": "Participant",
            "@id": participant_iri,
            "id": participant_id,
            "age": None,  # Will be extracted from session data if available
            "gender": "prefer-not-to-say",  # Default value
            "handedness": None,
            "created_at": consent_data["agreedAt"],
            "updated_at": consent_data["agreedAt"]
        }

        try:
            query = WOQLQuery().insert(participant_data)
            client.query(query)
            print(f"  ✓ Inserted participant {participant_id}")
        except Exception as e:
            print(f"  ✗ Failed to insert participant {participant_id}: {e}")

        # Insert consent
        consent_id = str(uuid.uuid4())
        consent_iri = f"terminusdb:///data/Consent/{consent_id}"
        consent_record = {
            "@type": "Consent",
            "@id": consent_iri,
            "id": consent_id,
            "signature": consent_data["signature"],
            "agreements": json.dumps(consent_data["agreements"]),
            "agreed_at": consent_data["agreedAt"],
            "created_at": consent_data["agreedAt"],
            "updated_at": consent_data["agreedAt"],
            "belongs_to_participant": participant_iri
        }

        try:
            query = WOQLQuery().woql_and(
                WOQLQuery().insert(consent_record),
                WOQLQuery().link(participant_iri, "has_consent", consent_iri)
            )
            client.query(query)
            print(f"  ✓ Inserted consent for {participant_id}")
        except Exception as e:
            print(f"  ✗ Failed to insert consent for {participant_id}: {e}")

    # Process session_data.json
    session_file = os.path.join(participant_dir, "session_data.json")
    if os.path.exists(session_file):
        with open(session_file, 'r', encoding='utf-8') as f:
            session_data = json.load(f)

        process_session_data(participant_id, session_data, client)

    # Process CSV files
    csv_files = glob.glob(os.path.join(participant_dir, "*.CSV"))
    for csv_file in csv_files:
        process_csv_data(participant_id, csv_file, client)

def process_session_data(participant_id: str, session_data: dict, client: WOQLClient):
    """Process session data from session_data.json."""
    events = session_data.get("events", [])

    sessions = {}
    responses = []
    word_stimuli = {}  # Track word stimuli to avoid duplicates

    participant_iri = f"terminusdb:///data/Participant/{participant_id}"

    for event in events:
        event_type = event.get("type")
        payload = event.get("payload", {})
        timestamp = parse_timestamp(event.get("timestamp"))

        if event_type == "session_started":
            session_id = str(uuid.uuid4())
            session_num = payload.get("session")

            sessions[session_num] = {
                "@type": "ExperimentSession",
                "@id": f"terminusdb:///data/ExperimentSession/{session_id}",
                "id": session_id,
                "session_type": f"session-{session_num}",
                "start_time": timestamp,
                "created_at": timestamp,
                "updated_at": timestamp,
                "belongs_to_participant": participant_iri
            }

        elif event_type == "session_ended" and payload.get("session") in sessions:
            session_num = payload.get("session")
            sessions[session_num]["end_time"] = timestamp
            sessions[session_num]["updated_at"] = timestamp

        elif event_type == "word_displayed":
            # Store word display info for later matching with speech_detected
            word_key = payload.get("key")
            if word_key:
                # Find corresponding speech_detected event (look ahead in the events)
                event_index = events.index(event)
                for i in range(event_index + 1, len(events)):
                    speech_event = events[i]
                    if (speech_event.get("type") == "speech_detected" and
                        speech_event.get("payload", {}).get("key") == word_key):
                        speech_payload = speech_event.get("payload", {})
                        speech_timestamp = parse_timestamp(speech_event.get("timestamp"))

                        # Calculate reaction time (ensure it's positive)
                        reaction_time_ms = max(0, speech_event.get("timestamp") - event.get("timestamp"))

                        # Handle word stimulus
                        stimulus_word = payload.get("word", "")
                        if stimulus_word and stimulus_word not in word_stimuli:
                            word_stimulus_id = hash(stimulus_word) % 2147483647  # Max int value
                            word_stimuli[stimulus_word] = word_stimulus_id

                        word_stimulus_id = word_stimuli.get(stimulus_word)

                        response_id = str(uuid.uuid4())
                        session_num = payload.get("session")

                        word_data = {
                            "@type": "ResponseData",
                            "@id": f"terminusdb:///data/ResponseData/{response_id}",
                            "id": response_id,
                            "stimulus_word": stimulus_word,
                            "response_word": speech_payload.get("word", ""),
                            "reaction_time_ms": reaction_time_ms,
                            "timestamp": timestamp,
                            "created_at": timestamp,
                            "updated_at": timestamp,
                            "belongs_to_participant": participant_iri,
                            "belongs_to_session": sessions[session_num]["@id"] if session_num and session_num in sessions else None,
                            "uses_stimulus": f"terminusdb:///data/WordStimulus/{word_stimulus_id}" if word_stimulus_id else None
                        }
                        # Remove None values
                        word_data = {k: v for k, v in word_data.items() if v is not None}
                        responses.append(word_data)
                        break

    # Insert word stimuli first
    for word, stimulus_id in word_stimuli.items():
        stimulus_doc = {
            "@type": "WordStimulus",
            "@id": f"terminusdb:///data/WordStimulus/{stimulus_id}",
            "id": str(stimulus_id),
            "word": word,
            "created_at": datetime.now().isoformat()
        }
        try:
            query = WOQLQuery().insert(stimulus_doc)
            client.query(query)
            print(f"  ✓ Inserted word stimulus: {word}")
        except Exception as e:
            print(f"  ✗ Failed to insert word stimulus {word}: {e}")

    # Insert sessions
    for session_data in sessions.values():
        try:
            query = WOQLQuery().woql_and(
                WOQLQuery().insert(session_data),
                WOQLQuery().link(participant_iri, "has_session", session_data["@id"])
            )
            client.query(query)
            print(f"  ✓ Inserted session {session_data['session_type']} for {participant_id}")
        except Exception as e:
            print(f"  ✗ Failed to insert session for {participant_id}: {e}")

    # Insert responses
    for response_data in responses:
        try:
            query = WOQLQuery().woql_and(
                WOQLQuery().insert(response_data),
                WOQLQuery().link(participant_iri, "has_response", response_data["@id"])
            )
            client.query(query)
        except Exception as e:
            print(f"  ✗ Failed to insert response for {participant_id}: {e}")

def process_csv_data(participant_id: str, csv_file: str, client: WOQLClient):
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

        participant_iri = f"terminusdb:///data/Participant/{participant_id}"

        # Update participant_response_data with skin potential data
        for idx, row in df.iterrows():
            timestamp = base_datetime + pd.Timedelta(seconds=row['Time_Sec'])

            # Find matching response record and update skin_potential
            try:
                # This is a simplified approach - in practice you'd need to match by timestamp
                # For now, we'll just update records that don't have skin_potential set

                # Query for response data without skin_potential for this participant
                query = WOQLQuery().woql_and(
                    WOQLQuery().triple("v:Response", "belongs_to_participant", participant_iri),
                    WOQLQuery().triple("v:Response", "skin_potential", "v:SkinPotential").opt(),
                    WOQLQuery().not_().triple("v:Response", "skin_potential", "xsd:decimal")
                )

                result = client.query(query)
                if result.get("bindings"):
                    # Update first matching record
                    response_iri = result["bindings"][0]["Response"]["@value"]
                    update_query = WOQLQuery().update_object({
                        "skin_potential": float(row['Ch1']),  # Using Ch1 as skin potential
                        "updated_at": timestamp.isoformat()
                    }).id(response_iri)
                    client.query(update_query)
                    break  # Only update first matching record to avoid duplicates

            except Exception as e:
                print(f"  ✗ Failed to update skin potential for {participant_id}: {e}")
                break  # Only update first matching record to avoid duplicates

    except Exception as e:
        print(f"  ✗ Failed to process CSV {csv_file}: {e}")

def main():
    """Main import function."""
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

        data_dir = "data"

        # Get all participant directories
        if not os.path.exists(data_dir):
            print(f"Data directory {data_dir} not found")
            return

        participant_dirs = [d for d in os.listdir(data_dir) if os.path.isdir(os.path.join(data_dir, d))]

        print(f"Found {len(participant_dirs)} participants to process")

        for participant_dir in participant_dirs:
            full_path = os.path.join(data_dir, participant_dir)
            process_participant_data(full_path, client)

        print("Import completed!")

    except Exception as e:
        print(f"Import failed: {e}")
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    main()
