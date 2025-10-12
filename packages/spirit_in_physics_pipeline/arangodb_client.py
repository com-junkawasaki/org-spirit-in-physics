#!/usr/bin/env python3
"""
ArangoDB client for Spirit in Physics experiment data management.
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from arango import ArangoClient
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ArangoDBClient:
    """ArangoDB client for Spirit in Physics data operations."""

    def __init__(self, server_url: str = "http://localhost:8529", user: str = "root", password: str = ""):
        """
        Initialize ArangoDB client.

        Args:
            server_url: ArangoDB server URL
            user: Database user
            password: Database password
        """
        self.server_url = server_url
        self.user = user
        self.password = password
        self.client = None
        self.db = None
        self.database_name = "spirit_in_physics"

    def connect(self) -> bool:
        """Connect to ArangoDB server."""
        try:
            self.client = ArangoClient(hosts=self.server_url)
            # First connect to system database to check/create our database
            sys_db = self.client.db("_system", username=self.user, password=self.password)
            self.db = sys_db
            logger.info(f"Connected to ArangoDB at {self.server_url}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to ArangoDB: {e}")
            return False

    def create_database(self) -> bool:
        """Create the spirit_in_physics database if it doesn't exist."""
        try:
            if not self.client:
                raise ConnectionError("Not connected to ArangoDB")

            # Check if database exists
            if self.database_name not in self.db.databases():
                self.db.create_database(self.database_name)
                logger.info(f"Created database: {self.database_name}")
            else:
                logger.info(f"Database {self.database_name} already exists")

            # Connect to the database
            self.db = self.client.db(self.database_name, username=self.user, password=self.password)
            return True
        except Exception as e:
            logger.error(f"Failed to create/connect to database: {e}")
            return False

    def create_collections(self) -> bool:
        """Create necessary collections in the database."""
        try:
            if not self.db:
                raise ConnectionError("Not connected to ArangoDB")

            collections = [
                "participants",
                "participant_sessions",
                "participant_session_responses",
                "word_stimuli",
                "analysis_runs",
                "analysis_results"
            ]

            for collection_name in collections:
                if not self.db.has_collection(collection_name):
                    self.db.create_collection(collection_name)
                    logger.info(f"Created collection: {collection_name}")
                else:
                    logger.info(f"Collection {collection_name} already exists")

            return True
        except Exception as e:
            logger.error(f"Failed to create collections: {e}")
            return False

    def insert_participant(self, participant_data: Dict[str, Any]) -> bool:
        """Insert a participant document."""
        try:
            if not self.db:
                raise ConnectionError("Not connected to ArangoDB")

            # Prepare participant document
            participant_doc = {
                "_key": participant_data.get("id"),
                "id": participant_data.get("id"),
                "age": participant_data.get("age"),
                "gender": participant_data.get("gender"),
                "handedness": participant_data.get("handedness"),
                "created_at": participant_data.get("created_at"),
                "updated_at": participant_data.get("updated_at")
            }

            # Remove None values
            participant_doc = {k: v for k, v in participant_doc.items() if v is not None}

            collection = self.db.collection("participants")
            result = collection.insert(participant_doc)
            logger.info(f"Inserted participant: {participant_data.get('id')}")
            return True
        except Exception as e:
            logger.error(f"Failed to insert participant {participant_data.get('id')}: {e}")
            return False

    def insert_session(self, session_data: Dict[str, Any]) -> bool:
        """Insert an experiment session document."""
        try:
            if not self.db:
                raise ConnectionError("Not connected to ArangoDB")

            # Prepare session document
            session_doc = {
                "_key": session_data.get("id"),
                "id": session_data.get("id"),
                "participant_id": session_data.get("participant_id"),
                "session_type": session_data.get("session_type"),
                "start_time": session_data.get("start_time"),
                "end_time": session_data.get("end_time"),
                "created_at": session_data.get("created_at"),
                "updated_at": session_data.get("updated_at")
            }

            # Remove None values
            session_doc = {k: v for k, v in session_doc.items() if v is not None}

            collection = self.db.collection("participant_sessions")
            result = collection.insert(session_doc)
            logger.info(f"Inserted session: {session_data.get('id')}")
            return True
        except Exception as e:
            logger.error(f"Failed to insert session {session_data.get('id')}: {e}")
            return False

    def insert_response_data(self, response_data: Dict[str, Any]) -> bool:
        """Insert response data document."""
        try:
            if not self.db:
                raise ConnectionError("Not connected to ArangoDB")

            # Prepare response document
            response_doc = {
                "_key": response_data.get("id"),
                "id": response_data.get("id"),
                "participant_id": response_data.get("participant_id"),
                "experiment_id": response_data.get("experiment_id"),
                "word_stimulus_id": response_data.get("word_stimulus_id"),
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
                "updated_at": response_data.get("updated_at")
            }

            # Remove None values
            response_doc = {k: v for k, v in response_doc.items() if v is not None}

            collection = self.db.collection("participant_session_responses")
            result = collection.insert(response_doc)
            logger.info(f"Inserted response data: {response_data.get('id')}")
            return True
        except Exception as e:
            logger.error(f"Failed to insert response data {response_data.get('id')}: {e}")
            return False

    def insert_word_stimulus(self, stimulus_data: Dict[str, Any]) -> bool:
        """Insert a word stimulus document."""
        try:
            if not self.db:
                raise ConnectionError("Not connected to ArangoDB")

            # Prepare stimulus document
            stimulus_doc = {
                "_key": str(stimulus_data.get("id")),
                "id": stimulus_data.get("id"),
                "word": stimulus_data.get("word"),
                "created_at": stimulus_data.get("created_at")
            }

            # Remove None values
            stimulus_doc = {k: v for k, v in stimulus_doc.items() if v is not None}

            collection = self.db.collection("word_stimuli")
            result = collection.insert(stimulus_doc)
            logger.info(f"Inserted word stimulus: {stimulus_data.get('word')}")
            return True
        except Exception as e:
            logger.error(f"Failed to insert word stimulus: {e}")
            return False

    def query_participants(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Query participants with their related data."""
        try:
            if not self.db:
                raise ConnectionError("Not connected to ArangoDB")

            # Use AQL (ArangoDB Query Language)
            aql = f"""
            FOR p IN participants
            LIMIT {limit}
            RETURN p
            """

            cursor = self.db.aql.execute(aql)
            return [doc for doc in cursor]
        except Exception as e:
            logger.error(f"Failed to query participants: {e}")
            return []

    def get_participant_with_sessions(self, participant_id: str) -> Optional[Dict[str, Any]]:
        """Get participant with their sessions and responses."""
        try:
            if not self.db:
                raise ConnectionError("Not connected to ArangoDB")

            # Use AQL to get participant with related data
            aql = """
            FOR p IN participants
            FILTER p.id == @participant_id
            LET sessions = (
                FOR s IN participant_sessions
                FILTER s.participant_id == p.id
                LET responses = (
                    FOR r IN participant_session_responses
                    FILTER r.participant_id == p.id AND r.experiment_id == s.id
                    RETURN r
                )
                RETURN MERGE(s, {responses: responses})
            )
            RETURN MERGE(p, {sessions: sessions})
            """

            bind_vars = {"participant_id": participant_id}
            cursor = self.db.aql.execute(aql, bind_vars=bind_vars)
            results = [doc for doc in cursor]
            return results[0] if results else None
        except Exception as e:
            logger.error(f"Failed to get participant with sessions: {e}")
            return None

    def close(self):
        """Close the database connection."""
        if self.client:
            self.client.close()
            logger.info("ArangoDB connection closed")


def main():
    """Test ArangoDB client functionality."""
    client = ArangoDBClient()

    if client.connect():
        if client.create_database():
            if client.create_collections():
                logger.info("ArangoDB setup completed successfully")
            else:
                logger.error("Failed to create collections")
        client.close()
    else:
        logger.error("Failed to connect to ArangoDB")


if __name__ == "__main__":
    main()
