#!/usr/bin/env python3
"""
Neo4j client for Spirit in Physics experiment data management.
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from neo4j import GraphDatabase, AsyncGraphDatabase
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Neo4jClient:
    """Neo4j client for Spirit in Physics data operations."""

    def __init__(self, uri: str = "bolt://localhost:7687", user: str = "neo4j", password: str = "password"):
        """
        Initialize Neo4j client.

        Args:
            uri: Neo4j server URI (bolt://localhost:7687)
            user: Database user
            password: Database password
        """
        self.uri = uri
        self.user = user
        self.password = password
        self.driver = None
        self.database_name = "spirit_in_physics"

    def connect(self) -> bool:
        """Connect to Neo4j server."""
        try:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            # Test connection
            with self.driver.session(database=self.database_name) as session:
                session.run("RETURN 1")
            logger.info(f"Connected to Neo4j at {self.uri}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            return False

    def create_database(self) -> bool:
        """Create the spirit_in_physics database if it doesn't exist."""
        try:
            if not self.driver:
                raise ConnectionError("Not connected to Neo4j")

            # Create database if it doesn't exist
            # Note: In Neo4j Community Edition, you can only use the default database
            # In Enterprise Edition, you can create multiple databases
            with self.driver.session() as session:
                try:
                    # Try to use the database (this will fail if it doesn't exist in Enterprise)
                    session.run(f"USE {self.database_name}")
                    logger.info(f"Database {self.database_name} already exists")
                except:
                    # In Community Edition, we just use the default database
                    logger.info(f"Using default Neo4j database")
            return True
        except Exception as e:
            logger.error(f"Failed to create/connect to database: {e}")
            return False

    def recreate_database(self) -> bool:
        """Drop and recreate the database."""
        try:
            if not self.driver:
                raise ConnectionError("Not connected to Neo4j")

            # In Neo4j, we can't drop the default database
            # Instead, we'll clear all data
            with self.driver.session(database=self.database_name) as session:
                # Delete all nodes and relationships
                session.run("MATCH (n) DETACH DELETE n")
                logger.info(f"Cleared all data in database: {self.database_name}")

            return True
        except Exception as e:
            logger.error(f"Failed to recreate database: {e}")
            return False

    def create_constraints_and_indexes(self) -> bool:
        """Create necessary constraints and indexes in the database."""
        try:
            if not self.driver:
                raise ConnectionError("Not connected to Neo4j")

            with self.driver.session(database=self.database_name) as session:
                # Create uniqueness constraints
                constraints = [
                    "CREATE CONSTRAINT participant_id_unique IF NOT EXISTS FOR (p:Participant) REQUIRE p.id IS UNIQUE",
                    "CREATE CONSTRAINT session_id_unique IF NOT EXISTS FOR (s:ExperimentSession) REQUIRE s.id IS UNIQUE",
                    "CREATE CONSTRAINT response_id_unique IF NOT EXISTS FOR (r:Response) REQUIRE r.id IS UNIQUE",
                    "CREATE CONSTRAINT stimulus_id_unique IF NOT EXISTS FOR (w:WordStimulus) REQUIRE w.id IS UNIQUE",
                    "CREATE CONSTRAINT analysis_run_id_unique IF NOT EXISTS FOR (ar:AnalysisRun) REQUIRE ar.id IS UNIQUE",
                    "CREATE CONSTRAINT job_id_unique IF NOT EXISTS FOR (j:ImportJob) REQUIRE j.id IS UNIQUE"
                ]

                for constraint in constraints:
                    try:
                        session.run(constraint)
                        logger.info(f"Created constraint: {constraint.split('FOR')[1].strip()}")
                    except Exception as e:
                        logger.warning(f"Failed to create constraint: {e}")

                # Create indexes for better performance
                indexes = [
                    "CREATE INDEX participant_age IF NOT EXISTS FOR (p:Participant) ON (p.age)",
                    "CREATE INDEX participant_gender IF NOT EXISTS FOR (p:Participant) ON (p.gender)",
                    "CREATE INDEX session_participant IF NOT EXISTS FOR (s:ExperimentSession) ON (s.participant_id)",
                    "CREATE INDEX response_session IF NOT EXISTS FOR (r:Response) ON (r.experiment_id)",
                    "CREATE INDEX response_participant IF NOT EXISTS FOR (r:Response) ON (r.participant_id)"
                ]

                for index in indexes:
                    try:
                        session.run(index)
                        logger.info(f"Created index: {index.split('FOR')[1].strip()}")
                    except Exception as e:
                        logger.warning(f"Failed to create index: {e}")

            return True
        except Exception as e:
            logger.error(f"Failed to create constraints and indexes: {e}")
            return False

    def insert_participant(self, participant_data: Dict[str, Any]) -> bool:
        """Insert a participant node."""
        try:
            if not self.driver:
                raise ConnectionError("Not connected to Neo4j")

            with self.driver.session(database=self.database_name) as session:
                # Prepare participant properties
                properties = {
                    "id": participant_data.get("id"),
                    "age": participant_data.get("age"),
                    "gender": participant_data.get("gender"),
                    "handedness": participant_data.get("handedness"),
                    "created_at": participant_data.get("created_at"),
                    "updated_at": participant_data.get("updated_at")
                }

                # Remove None values
                properties = {k: v for k, v in properties.items() if v is not None}

                # Create or update participant node
                query = """
                MERGE (p:Participant {id: $id})
                SET p += $properties
                RETURN p
                """

                result = session.run(query, id=participant_data.get("id"), properties=properties)
                record = result.single()
                if record:
                    logger.info(f"Inserted or updated participant: {participant_data.get('id')}")
                    return True
                else:
                    logger.error(f"Failed to insert participant: {participant_data.get('id')}")
                    return False
        except Exception as e:
            logger.error(f"Failed to insert participant {participant_data.get('id')}: {e}")
            return False

    def insert_session(self, session_data: Dict[str, Any]) -> bool:
        """Insert an experiment session node and create relationship with participant."""
        try:
            if not self.driver:
                raise ConnectionError("Not connected to Neo4j")

            with self.driver.session(database=self.database_name) as session:
                # Prepare session properties
                properties = {
                    "id": session_data.get("id"),
                    "participant_id": session_data.get("participant_id"),
                    "session_type": session_data.get("session_type"),
                    "start_time": session_data.get("start_time"),
                    "end_time": session_data.get("end_time"),
                    "created_at": session_data.get("created_at"),
                    "updated_at": session_data.get("updated_at")
                }

                # Remove None values
                properties = {k: v for k, v in properties.items() if v is not None}

                # Create session node and relationship with participant
                query = """
                MATCH (p:Participant {id: $participant_id})
                MERGE (s:ExperimentSession {id: $id})
                SET s += $properties
                MERGE (p)-[:HAS_SESSION]->(s)
                RETURN s
                """

                result = session.run(query,
                                   id=session_data.get("id"),
                                   participant_id=session_data.get("participant_id"),
                                   properties=properties)
                record = result.single()
                if record:
                    logger.info(f"Inserted session: {session_data.get('id')}")
                    return True
                else:
                    logger.error(f"Failed to insert session: {session_data.get('id')}")
                    return False
        except Exception as e:
            logger.error(f"Failed to insert session {session_data.get('id')}: {e}")
            return False

    def insert_response_data(self, response_data: Dict[str, Any]) -> bool:
        """Insert response data node and create relationships."""
        try:
            if not self.driver:
                raise ConnectionError("Not connected to Neo4j")

            with self.driver.session(database=self.database_name) as session:
                # Prepare response properties
                properties = {
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
                properties = {k: v for k, v in properties.items() if v is not None}

                # Create response node and relationships
                query = """
                MATCH (p:Participant {id: $participant_id})
                MATCH (s:ExperimentSession {id: $experiment_id})
                MERGE (r:Response {id: $id})
                SET r += $properties
                MERGE (s)-[:HAS_RESPONSE]->(r)
                MERGE (p)-[:HAS_RESPONSE]->(r)
                WITH r
                OPTIONAL MATCH (w:WordStimulus {id: $word_stimulus_id})
                FOREACH (_ IN CASE WHEN w IS NOT NULL THEN [1] ELSE [] END |
                  MERGE (r)-[:USES_STIMULUS]->(w)
                )
                RETURN r
                """

                result = session.run(query,
                                   id=response_data.get("id"),
                                   participant_id=response_data.get("participant_id"),
                                   experiment_id=response_data.get("experiment_id"),
                                   word_stimulus_id=response_data.get("word_stimulus_id"),
                                   properties=properties)
                record = result.single()
                if record:
                    logger.info(f"Inserted response data: {response_data.get('id')}")
                    return True
                else:
                    logger.error(f"Failed to insert response data: {response_data.get('id')}")
                    return False
        except Exception as e:
            logger.error(f"Failed to insert response data {response_data.get('id')}: {e}")
            return False

    def insert_word_stimulus(self, stimulus_data: Dict[str, Any]) -> bool:
        """Insert a word stimulus node."""
        try:
            if not self.driver:
                raise ConnectionError("Not connected to Neo4j")

            with self.driver.session(database=self.database_name) as session:
                # Prepare stimulus properties
                properties = {
                    "id": stimulus_data.get("id"),
                    "word": stimulus_data.get("word"),
                    "created_at": stimulus_data.get("created_at")
                }

                # Remove None values
                properties = {k: v for k, v in properties.items() if v is not None}

                # Create stimulus node
                query = """
                MERGE (w:WordStimulus {id: $id})
                SET w += $properties
                RETURN w
                """

                result = session.run(query, id=stimulus_data.get("id"), properties=properties)
                record = result.single()
                if record:
                    logger.info(f"Inserted word stimulus: {stimulus_data.get('word')}")
                    return True
                else:
                    logger.error(f"Failed to insert word stimulus: {stimulus_data.get('id')}")
                    return False
        except Exception as e:
            logger.error(f"Failed to insert word stimulus: {e}")
            return False

    def query_participants(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Query participants with their related data."""
        try:
            if not self.driver:
                raise ConnectionError("Not connected to Neo4j")

            with self.driver.session(database=self.database_name) as session:
                # Use Cypher query
                query = """
                MATCH (p:Participant)
                RETURN p
                LIMIT $limit
                """

                result = session.run(query, limit=limit)
                return [record["p"] for record in result]
        except Exception as e:
            logger.error(f"Failed to query participants: {e}")
            return []

    def get_participant_with_sessions(self, participant_id: str) -> Optional[Dict[str, Any]]:
        """Get participant with their sessions and responses."""
        try:
            if not self.driver:
                raise ConnectionError("Not connected to Neo4j")

            with self.driver.session(database=self.database_name) as session:
                # Use Cypher to get participant with related data
                query = """
                MATCH (p:Participant {id: $participant_id})
                OPTIONAL MATCH (p)-[:HAS_SESSION]->(s:ExperimentSession)
                OPTIONAL MATCH (s)-[:HAS_RESPONSE]->(r:Response)
                RETURN p,
                       collect(DISTINCT s) as sessions,
                       collect(DISTINCT r) as responses
                """

                result = session.run(query, participant_id=participant_id)
                record = result.single()

                if record:
                    participant = dict(record["p"])
                    sessions = [dict(s) for s in record["sessions"]]
                    responses = [dict(r) for r in record["responses"]]

                    # Group responses by session
                    session_responses = {}
                    for response in responses:
                        session_id = response.get("experiment_id")
                        if session_id not in session_responses:
                            session_responses[session_id] = []
                        session_responses[session_id].append(response)

                    # Attach responses to sessions
                    for session in sessions:
                        session["responses"] = session_responses.get(session["id"], [])

                    participant["sessions"] = sessions
                    return participant

                return None
        except Exception as e:
            logger.error(f"Failed to get participant with sessions: {e}")
            return None

    def close(self):
        """Close the database connection."""
        if self.driver:
            self.driver.close()
            logger.info("Neo4j connection closed")


def main():
    """Test Neo4j client functionality."""
    client = Neo4jClient()

    if client.connect():
        if client.create_database():
            if client.create_constraints_and_indexes():
                logger.info("Neo4j setup completed successfully")
            else:
                logger.error("Failed to create constraints and indexes")
        client.close()
    else:
        logger.error("Failed to connect to Neo4j")


if __name__ == "__main__":
    main()
