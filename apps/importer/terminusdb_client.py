#!/usr/bin/env python3
"""
TerminusDB client for Spirit in Physics experiment data management.
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from terminusdb_client import WOQLClient, WOQLQuery
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TerminusDBClient:
    """TerminusDB client for Spirit in Physics data operations."""

    def __init__(self, server_url: str = "http://localhost:6363", user: str = "admin", password: str = "root"):
        """
        Initialize TerminusDB client.

        Args:
            server_url: TerminusDB server URL
            user: Database user
            password: Database password
        """
        self.server_url = server_url
        self.user = user
        self.password = password
        self.client = None
        self.database_id = "spirit_in_physics"

    def connect(self) -> bool:
        """Connect to TerminusDB server."""
        try:
            self.client = WOQLClient(server=self.server_url, user=self.user, password=self.password)
            logger.info(f"Connected to TerminusDB at {self.server_url}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to TerminusDB: {e}")
            return False

    def create_database(self) -> bool:
        """Create the spirit_in_physics database if it doesn't exist."""
        try:
            if not self.client:
                raise ConnectionError("Not connected to TerminusDB")

            # Check if database exists
            if self.database_id not in self.client.list_databases():
                self.client.create_database(self.database_id, "Spirit in Physics Experiment Database")
                logger.info(f"Created database: {self.database_id}")
            else:
                logger.info(f"Database {self.database_id} already exists")

            # Connect to the database
            self.client.connect(self.database_id)
            return True
        except Exception as e:
            logger.error(f"Failed to create/connect to database: {e}")
            return False

    def load_schema(self, schema_path: str) -> bool:
        """Load RDF schema into the database."""
        try:
            if not self.client:
                raise ConnectionError("Not connected to TerminusDB")

            with open(schema_path, 'r') as f:
                schema = json.load(f)

            # Insert schema
            query = WOQLQuery().woql_and(
                WOQLQuery().insert(schema["@graph"])
            )

            result = self.client.query(query)
            logger.info("Schema loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load schema: {e}")
            return False

    def insert_participant(self, participant_data: Dict[str, Any]) -> bool:
        """Insert a participant document."""
        try:
            if not self.client:
                raise ConnectionError("Not connected to TerminusDB")

            # Create participant IRI
            participant_id = participant_data.get("id")
            participant_iri = f"terminusdb:///data/Participant/{participant_id}"

            # Prepare participant document
            participant_doc = {
                "@type": "Participant",
                "@id": participant_iri,
                "id": participant_id,
                "age": participant_data.get("age"),
                "gender": participant_data.get("gender"),
                "handedness": participant_data.get("handedness"),
                "created_at": participant_data.get("created_at"),
                "updated_at": participant_data.get("updated_at")
            }

            # Remove None values
            participant_doc = {k: v for k, v in participant_doc.items() if v is not None}

            query = WOQLQuery().insert(participant_doc)
            result = self.client.query(query)
            logger.info(f"Inserted participant: {participant_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to insert participant {participant_id}: {e}")
            return False

    def insert_consent(self, consent_data: Dict[str, Any]) -> bool:
        """Insert a consent document."""
        try:
            if not self.client:
                raise ConnectionError("Not connected to TerminusDB")

            # Create consent IRI
            consent_id = consent_data.get("id", str(hash(str(consent_data))))
            consent_iri = f"terminusdb:///data/Consent/{consent_id}"
            participant_iri = f"terminusdb:///data/Participant/{consent_data.get('participant_id')}"

            # Prepare consent document
            consent_doc = {
                "@type": "Consent",
                "@id": consent_iri,
                "id": consent_id,
                "signature": consent_data.get("signature"),
                "agreements": json.dumps(consent_data.get("agreements", {})),
                "agreed_at": consent_data.get("agreed_at"),
                "created_at": consent_data.get("created_at"),
                "updated_at": consent_data.get("updated_at"),
                "belongs_to_participant": participant_iri
            }

            # Remove None values
            consent_doc = {k: v for k, v in consent_doc.items() if v is not None}

            query = WOQLQuery().woql_and(
                WOQLQuery().insert(consent_doc),
                WOQLQuery().link(participant_iri, "has_consent", consent_iri)
            )

            result = self.client.query(query)
            logger.info(f"Inserted consent for participant: {consent_data.get('participant_id')}")
            return True
        except Exception as e:
            logger.error(f"Failed to insert consent: {e}")
            return False

    def insert_session(self, session_data: Dict[str, Any]) -> bool:
        """Insert an experiment session document."""
        try:
            if not self.client:
                raise ConnectionError("Not connected to TerminusDB")

            # Create session IRI
            session_id = session_data.get("id")
            session_iri = f"terminusdb:///data/ExperimentSession/{session_id}"
            participant_iri = f"terminusdb:///data/Participant/{session_data.get('participant_id')}"

            # Prepare session document
            session_doc = {
                "@type": "ExperimentSession",
                "@id": session_iri,
                "id": session_id,
                "session_type": session_data.get("session_type"),
                "start_time": session_data.get("start_time"),
                "end_time": session_data.get("end_time"),
                "created_at": session_data.get("created_at"),
                "updated_at": session_data.get("updated_at"),
                "belongs_to_participant": participant_iri
            }

            # Remove None values
            session_doc = {k: v for k, v in session_doc.items() if v is not None}

            query = WOQLQuery().woql_and(
                WOQLQuery().insert(session_doc),
                WOQLQuery().link(participant_iri, "has_session", session_iri)
            )

            result = self.client.query(query)
            logger.info(f"Inserted session: {session_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to insert session {session_id}: {e}")
            return False

    def insert_word_stimulus(self, stimulus_data: Dict[str, Any]) -> bool:
        """Insert a word stimulus document."""
        try:
            if not self.client:
                raise ConnectionError("Not connected to TerminusDB")

            # Create stimulus IRI
            stimulus_id = str(stimulus_data.get("id"))
            stimulus_iri = f"terminusdb:///data/WordStimulus/{stimulus_id}"

            # Prepare stimulus document
            stimulus_doc = {
                "@type": "WordStimulus",
                "@id": stimulus_iri,
                "id": stimulus_id,
                "word": stimulus_data.get("word"),
                "created_at": stimulus_data.get("created_at")
            }

            # Remove None values
            stimulus_doc = {k: v for k, v in stimulus_doc.items() if v is not None}

            query = WOQLQuery().insert(stimulus_doc)
            result = self.client.query(query)
            logger.info(f"Inserted word stimulus: {stimulus_data.get('word')}")
            return True
        except Exception as e:
            logger.error(f"Failed to insert word stimulus: {e}")
            return False

    def insert_response_data(self, response_data: Dict[str, Any]) -> bool:
        """Insert response data document."""
        try:
            if not self.client:
                raise ConnectionError("Not connected to TerminusDB")

            # Create response IRI
            response_id = response_data.get("id")
            response_iri = f"terminusdb:///data/ResponseData/{response_id}"
            participant_iri = f"terminusdb:///data/Participant/{response_data.get('participant_id')}"
            session_iri = f"terminusdb:///data/ExperimentSession/{response_data.get('experiment_id')}"
            stimulus_iri = f"terminusdb:///data/WordStimulus/{response_data.get('word_stimulus_id')}"

            # Prepare response document
            response_doc = {
                "@type": "ResponseData",
                "@id": response_iri,
                "id": response_id,
                "stimulus_word": response_data.get("stimulus_word"),
                "response_word": response_data.get("response_word"),
                "reaction_time_ms": response_data.get("reaction_time_ms"),
                "timestamp": response_data.get("timestamp"),
                "audio_file_path": response_data.get("audio_file_path"),
                "video_file_path": response_data.get("video_file_path"),
                "skin_potential": response_data.get("skin_potential"),
                "emotion": response_data.get("emotion"),
                "emotion_confidence": response_data.get("emotion_confidence"),
                "created_at": response_data.get("created_at"),
                "updated_at": response_data.get("updated_at"),
                "belongs_to_participant": participant_iri,
                "belongs_to_session": session_iri,
                "uses_stimulus": stimulus_iri
            }

            # Remove None values
            response_doc = {k: v for k, v in response_doc.items() if v is not None}

            query = WOQLQuery().woql_and(
                WOQLQuery().insert(response_doc),
                WOQLQuery().link(participant_iri, "has_response", response_iri)
            )

            result = self.client.query(query)
            logger.info(f"Inserted response data: {response_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to insert response data {response_id}: {e}")
            return False

    def query_participants(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Query participants with their related data."""
        try:
            if not self.client:
                raise ConnectionError("Not connected to TerminusDB")

            query = WOQLQuery().woql_and(
                WOQLQuery().triple("v:Participant", "rdf:type", "scm:Participant"),
                WOQLQuery().triple("v:Participant", "scm:id", "v:Id"),
                WOQLQuery().triple("v:Participant", "scm:age", "v:Age").opt(),
                WOQLQuery().triple("v:Participant", "scm:gender", "v:Gender").opt(),
                WOQLQuery().triple("v:Participant", "scm:handedness", "v:Handedness").opt(),
                WOQLQuery().limit(limit)
            )

            result = self.client.query(query)
            return result.get("bindings", [])
        except Exception as e:
            logger.error(f"Failed to query participants: {e}")
            return []

    def close(self):
        """Close the database connection."""
        if self.client:
            self.client.close()
            logger.info("TerminusDB connection closed")


def main():
    """Test TerminusDB client functionality."""
    client = TerminusDBClient()

    if client.connect():
        if client.create_database():
            schema_path = Path(__file__).parent / "terminusdb_schema.jsonld"
            if schema_path.exists():
                client.load_schema(str(schema_path))
                logger.info("TerminusDB setup completed successfully")
            else:
                logger.error(f"Schema file not found: {schema_path}")
        client.close()
    else:
        logger.error("Failed to connect to TerminusDB")


if __name__ == "__main__":
    main()
