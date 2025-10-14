import sys
import os
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))
from packages.spirit_in_physics_pipeline.data_loader import DataLoader
from packages.spirit_in_physics_pipeline.data_storer import DataStorer

logger = logging.getLogger(__name__)

class Neo4jActivities:
    def __init__(self, config):
        self.config = config
        self.data_loader = DataLoader(config['arangodb'])
        self.data_storer = DataStorer(config['arangodb'])

    async def get_session_for_ingestion(self, session_id: str) -> dict:
        """Get experiment session information for ingestion workflow."""
        logger.info(f"Getting session for ingestion: {session_id}")

        try:
            # Initialize Neo4j client
            from neo4j import GraphDatabase
            driver = GraphDatabase.driver(self.config['neo4j']['uri'],
                                        auth=(self.config['neo4j']['user'], self.config['neo4j']['password']))

            with driver.session(database=self.config['neo4j']['database']) as session:
                # Query Neo4j for session information
                cypher_query = """
                MATCH (s:ExperimentSession {id: $session_id})
                RETURN s.id as id,
                       s.participant_id as participant_id,
                       s.storage_path as storage_path,
                       s.status as status,
                       s.created_at as created_at,
                       s.video_file_path as video_file_path
                """

                result = session.run(cypher_query, {"session_id": session_id})
                sessions = list(result)

                if not sessions:
                    raise ValueError(f"Session {session_id} not found")

                session_info = dict(sessions[0])
                logger.info(f"Found session: {session_info}")

                return session_info

        except Exception as e:
            logger.error(f"Failed to get session {session_id}: {e}")
            raise

    async def download_media_file(self, storage_path: str) -> str:
        """Download media file from storage to local temporary directory."""
        logger.info(f"Downloading media file: {storage_path}")

        try:
            # Use DataLoader's download method
            local_path = self.data_loader.download_media_file(storage_path)
            logger.info(f"Successfully downloaded to: {local_path}")
            return local_path

        except Exception as e:
            logger.error(f"Failed to download media file {storage_path}: {e}")
            raise

    async def store_raw_hume_data(self, data: tuple) -> None:
        """Store raw Hume AI analysis results in Neo4j."""
        session_id, artifacts = data
        logger.info(f"Storing raw Hume data for session: {session_id}")

        try:
            # Initialize Neo4j client
            from neo4j import GraphDatabase
            driver = GraphDatabase.driver(self.config['neo4j']['uri'],
                                        auth=(self.config['neo4j']['user'], self.config['neo4j']['password']))

            with driver.session(database=self.config['neo4j']['database']) as session:
                # Store raw artifacts as a node
                raw_data = {
                    "id": f"{session_id}_raw",
                    "session_id": session_id,
                    "artifacts": json.dumps(artifacts),
                    "stored_at": datetime.utcnow().isoformat() + "Z",
                    "data_type": "raw_hume_artifacts"
                }

                session.run("""
                    CREATE (r:RawHumeData $raw_data)
                    RETURN r
                """, {"raw_data": raw_data})

                logger.info(f"Successfully stored raw Hume data for session {session_id}")

        except Exception as e:
            logger.error(f"Failed to store raw Hume data for session {session_id}: {e}")
            raise

    async def parse_and_store_structured_data(self, data: tuple) -> None:
        """Parse Hume AI artifacts and store structured data in Neo4j."""
        session_id, artifacts = data
        logger.info(f"Parsing and storing structured Hume data for session: {session_id}")

        try:
            # Initialize Neo4j client
            from neo4j import GraphDatabase
            driver = GraphDatabase.driver(self.config['neo4j']['uri'],
                                        auth=(self.config['neo4j']['user'], self.config['neo4j']['password']))

            with driver.session(database=self.config['neo4j']['database']) as session:
                # Process face predictions
                if 'face' in artifacts:
                    for prediction in artifacts['face'].get('predictions', []):
                        face_data = {
                            "id": f"{session_id}_face_{prediction.get('time', 0)}",
                            "session_id": session_id,
                            "prediction_type": "face",
                            "time": prediction.get('time', 0),
                            "emotions": json.dumps(prediction.get('emotions', [])),
                            "face_box": json.dumps(prediction.get('face_box', {})),
                            "raw_prediction": json.dumps(prediction),
                            "created_at": datetime.utcnow().isoformat() + "Z"
                        }

                        session.run("""
                            MATCH (s:ExperimentSession {id: $session_id})
                            CREATE (s)-[:HAS_FACE_PREDICTION]->(f:HumeFacePrediction $face_data)
                            RETURN f
                        """, {"session_id": session_id, "face_data": face_data})

                # Process prosody predictions
                if 'prosody' in artifacts:
                    for prediction in artifacts['prosody'].get('predictions', []):
                        prosody_data = {
                            "id": f"{session_id}_prosody_{prediction.get('time', 0)}",
                            "session_id": session_id,
                            "prediction_type": "prosody",
                            "time": prediction.get('time', 0),
                            "emotions": json.dumps(prediction.get('emotions', [])),
                            "raw_prediction": json.dumps(prediction),
                            "created_at": datetime.utcnow().isoformat() + "Z"
                        }

                        session.run("""
                            MATCH (s:ExperimentSession {id: $session_id})
                            CREATE (s)-[:HAS_PROSODY_PREDICTION]->(p:HumeProsodyPrediction $prosody_data)
                            RETURN p
                        """, {"session_id": session_id, "prosody_data": prosody_data})

                # Process language predictions
                if 'language' in artifacts:
                    for prediction in artifacts['language'].get('predictions', []):
                        language_data = {
                            "id": f"{session_id}_language_{prediction.get('time', 0)}",
                            "session_id": session_id,
                            "prediction_type": "language",
                            "time": prediction.get('time', 0),
                            "text": prediction.get('text', ''),
                            "emotions": json.dumps(prediction.get('emotions', [])),
                            "raw_prediction": json.dumps(prediction),
                            "created_at": datetime.utcnow().isoformat() + "Z"
                        }

                        session.run("""
                            MATCH (s:ExperimentSession {id: $session_id})
                            CREATE (s)-[:HAS_LANGUAGE_PREDICTION]->(l:HumeLanguagePrediction $language_data)
                            RETURN l
                        """, {"session_id": session_id, "language_data": language_data})

                logger.info(f"Successfully stored structured predictions for session {session_id}")

        except Exception as e:
            logger.error(f"Failed to parse and store structured data for session {session_id}: {e}")
            raise

    async def update_session_status(self, data: tuple) -> None:
        """Update experiment session status in Neo4j."""
        session_id, status = data
        logger.info(f"Updating session {session_id} to status: {status}")

        try:
            # Initialize Neo4j client
            from neo4j import GraphDatabase
            driver = GraphDatabase.driver(self.config['neo4j']['uri'],
                                        auth=(self.config['neo4j']['user'], self.config['neo4j']['password']))

            with driver.session(database=self.config['neo4j']['database']) as session:
                # Update session status
                session.run("""
                    MATCH (s:ExperimentSession {id: $session_id})
                    SET s.status = $status,
                        s.updated_at = $updated_at
                    RETURN s
                """, {
                    "session_id": session_id,
                    "status": status,
                    "updated_at": datetime.utcnow().isoformat() + "Z"
                })

                logger.info(f"Successfully updated session {session_id} to status: {status}")

        except Exception as e:
            logger.error(f"Failed to update session {session_id} status: {e}")
            raise

    async def cleanup_temp_files(self, local_path: str) -> None:
        """Clean up temporary files after processing."""
        logger.info(f"Cleaning up temporary file: {local_path}")

        try:
            if os.path.exists(local_path):
                os.remove(local_path)
                logger.info(f"Successfully removed temporary file: {local_path}")
            else:
                logger.warning(f"Temporary file not found: {local_path}")

        except Exception as e:
            logger.error(f"Failed to cleanup temporary file {local_path}: {e}")
            # Don't raise exception for cleanup failures
