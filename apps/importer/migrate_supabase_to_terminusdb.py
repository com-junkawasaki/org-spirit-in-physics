#!/usr/bin/env python3
"""
Script to migrate data from Supabase to TerminusDB.
"""

import os
import json
from datetime import datetime
from supabase import create_client, Client
from terminusdb_client import WOQLClient, WOQLQuery
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load configuration from config.yaml
import yaml
with open('config.yaml') as f:
    config = yaml.safe_load(f)

# Supabase configuration
SUPABASE_URL = config['supabase']['url']
SUPABASE_KEY = config['supabase']['service_role_key']

# TerminusDB configuration
TERMINUSDB_URL = config.get('terminusdb', {}).get('url', 'http://localhost:6363')
TERMINUSDB_USER = config.get('terminusdb', {}).get('user', 'admin')
TERMINUSDB_PASSWORD = config.get('terminusdb', {}).get('password', 'root')
DATABASE_ID = "spirit_in_physics"

def get_supabase_client() -> Client:
    """Get Supabase client instance."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def get_terminusdb_client() -> WOQLClient:
    """Get TerminusDB client instance."""
    client = WOQLClient(server=TERMINUSDB_URL, user=TERMINUSDB_USER, password=TERMINUSDB_PASSWORD)
    client.connect(DATABASE_ID)
    return client

def migrate_participants(supabase: Client, terminusdb: WOQLClient):
    """Migrate participants from Supabase to TerminusDB."""
    logger.info("Migrating participants...")

    # Query all participants from Supabase
    participants = supabase.table("participants").select("*").execute()

    for participant in participants.data:
        participant_iri = f"terminusdb:///data/Participant/{participant['id']}"

        # Convert participant data to TerminusDB format
        participant_doc = {
            "@type": "Participant",
            "@id": participant_iri,
            "id": participant["id"],
            "age": participant.get("age"),
            "gender": participant.get("gender"),
            "handedness": participant.get("handedness"),
            "created_at": participant.get("created_at"),
            "updated_at": participant.get("updated_at")
        }

        # Remove None values
        participant_doc = {k: v for k, v in participant_doc.items() if v is not None}

        try:
            query = WOQLQuery().insert(participant_doc)
            terminusdb.query(query)
            logger.info(f"Migrated participant: {participant['id']}")
        except Exception as e:
            logger.error(f"Failed to migrate participant {participant['id']}: {e}")

def migrate_consents(supabase: Client, terminusdb: WOQLClient):
    """Migrate participant consents from Supabase to TerminusDB."""
    logger.info("Migrating consents...")

    # Query all consents from Supabase
    consents = supabase.table("participant_consents").select("*").execute()

    for consent in consents.data:
        consent_iri = f"terminusdb:///data/Consent/{consent['id']}"
        participant_iri = f"terminusdb:///data/Participant/{consent['participant_id']}"

        # Convert consent data to TerminusDB format
        consent_doc = {
            "@type": "Consent",
            "@id": consent_iri,
            "id": consent["id"],
            "signature": consent.get("signature"),
            "agreements": json.dumps(consent.get("agreements", {})),
            "agreed_at": consent.get("agreed_at"),
            "created_at": consent.get("created_at"),
            "updated_at": consent.get("updated_at"),
            "belongs_to_participant": participant_iri
        }

        # Remove None values
        consent_doc = {k: v for k, v in consent_doc.items() if v is not None}

        try:
            query = WOQLQuery().woql_and(
                WOQLQuery().insert(consent_doc),
                WOQLQuery().link(participant_iri, "has_consent", consent_iri)
            )
            terminusdb.query(query)
            logger.info(f"Migrated consent for participant: {consent['participant_id']}")
        except Exception as e:
            logger.error(f"Failed to migrate consent {consent['id']}: {e}")

def migrate_sessions(supabase: Client, terminusdb: WOQLClient):
    """Migrate experiment sessions from Supabase to TerminusDB."""
    logger.info("Migrating experiment sessions...")

    # Query all sessions from Supabase
    sessions = supabase.table("participant_experiment_sessions").select("*").execute()

    for session in sessions.data:
        session_iri = f"terminusdb:///data/ExperimentSession/{session['id']}"
        participant_iri = f"terminusdb:///data/Participant/{session['participant_id']}"

        # Convert session data to TerminusDB format
        session_doc = {
            "@type": "ExperimentSession",
            "@id": session_iri,
            "id": session["id"],
            "session_type": session.get("session_type"),
            "start_time": session.get("start_time"),
            "end_time": session.get("end_time"),
            "created_at": session.get("created_at"),
            "updated_at": session.get("updated_at"),
            "belongs_to_participant": participant_iri
        }

        # Remove None values
        session_doc = {k: v for k, v in session_doc.items() if v is not None}

        try:
            query = WOQLQuery().woql_and(
                WOQLQuery().insert(session_doc),
                WOQLQuery().link(participant_iri, "has_session", session_iri)
            )
            terminusdb.query(query)
            logger.info(f"Migrated session: {session['id']}")
        except Exception as e:
            logger.error(f"Failed to migrate session {session['id']}: {e}")

def migrate_word_stimuli(supabase: Client, terminusdb: WOQLClient):
    """Migrate word stimuli from Supabase to TerminusDB."""
    logger.info("Migrating word stimuli...")

    # Query all word stimuli from Supabase
    stimuli = supabase.table("word_stimuli").select("*").execute()

    for stimulus in stimuli.data:
        stimulus_iri = f"terminusdb:///data/WordStimulus/{stimulus['id']}"

        # Convert stimulus data to TerminusDB format
        stimulus_doc = {
            "@type": "WordStimulus",
            "@id": stimulus_iri,
            "id": str(stimulus["id"]),
            "word": stimulus.get("word"),
            "created_at": stimulus.get("created_at")
        }

        # Remove None values
        stimulus_doc = {k: v for k, v in stimulus_doc.items() if v is not None}

        try:
            query = WOQLQuery().insert(stimulus_doc)
            terminusdb.query(query)
            logger.info(f"Migrated word stimulus: {stimulus['word']}")
        except Exception as e:
            logger.error(f"Failed to migrate word stimulus {stimulus['id']}: {e}")

def migrate_response_data(supabase: Client, terminusdb: WOQLClient):
    """Migrate response data from Supabase to TerminusDB."""
    logger.info("Migrating response data...")

    # Query all response data from Supabase (in batches to handle large datasets)
    batch_size = 1000
    offset = 0

    while True:
        responses = supabase.table("participant_response_data").select("*").range(offset, offset + batch_size - 1).execute()

        if not responses.data:
            break

        for response in responses.data:
            response_iri = f"terminusdb:///data/ResponseData/{response['id']}"
            participant_iri = f"terminusdb:///data/Participant/{response['participant_id']}"
            session_iri = f"terminusdb:///data/ExperimentSession/{response['experiment_id']}"
            stimulus_iri = f"terminusdb:///data/WordStimulus/{response['word_stimulus_id']}"

            # Convert response data to TerminusDB format
            response_doc = {
                "@type": "ResponseData",
                "@id": response_iri,
                "id": response["id"],
                "stimulus_word": response.get("stimulus_word"),
                "response_word": response.get("response_word"),
                "reaction_time_ms": response.get("reaction_time_ms"),
                "timestamp": response.get("timestamp"),
                "audio_file_path": response.get("audio_file_path"),
                "video_file_path": response.get("video_file_path"),
                "skin_potential": response.get("skin_potential"),
                "emotion": response.get("emotion"),
                "emotion_confidence": response.get("emotion_confidence"),
                "created_at": response.get("created_at"),
                "updated_at": response.get("updated_at"),
                "belongs_to_participant": participant_iri,
                "belongs_to_session": session_iri,
                "uses_stimulus": stimulus_iri
            }

            # Remove None values
            response_doc = {k: v for k, v in response_doc.items() if v is not None}

            try:
                query = WOQLQuery().woql_and(
                    WOQLQuery().insert(response_doc),
                    WOQLQuery().link(participant_iri, "has_response", response_iri)
                )
                terminusdb.query(query)
            except Exception as e:
                logger.error(f"Failed to migrate response {response['id']}: {e}")

        offset += batch_size
        logger.info(f"Processed {offset} response records...")

def main():
    """Main migration function."""
    try:
        # Initialize clients
        supabase = get_supabase_client()
        terminusdb = WOQLClient(server=TERMINUSDB_URL, user=TERMINUSDB_USER, password=TERMINUSDB_PASSWORD)

        # Create database if it doesn't exist
        if DATABASE_ID not in terminusdb.list_databases():
            terminusdb.create_database(DATABASE_ID, "Spirit in Physics Experiment Database")
            logger.info(f"Created database: {DATABASE_ID}")
        else:
            logger.info(f"Database {DATABASE_ID} already exists")

        # Connect to database
        terminusdb.connect(DATABASE_ID)

        # Load schema
        schema_path = Path(__file__).parent / "terminusdb_schema.jsonld"
        if schema_path.exists():
            with open(schema_path, 'r') as f:
                schema = json.load(f)

            query = WOQLQuery().insert(schema["@graph"])
            terminusdb.query(query)
            logger.info("Schema loaded successfully")
        else:
            logger.warning(f"Schema file not found at {schema_path}")

        # Perform migration in order
        logger.info("Starting data migration from Supabase to TerminusDB...")

        migrate_word_stimuli(supabase, terminusdb)
        migrate_participants(supabase, terminusdb)
        migrate_consents(supabase, terminusdb)
        migrate_sessions(supabase, terminusdb)
        migrate_response_data(supabase, terminusdb)

        logger.info("Migration completed successfully!")

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise
    finally:
        if 'terminusdb' in locals():
            terminusdb.close()

if __name__ == "__main__":
    main()
