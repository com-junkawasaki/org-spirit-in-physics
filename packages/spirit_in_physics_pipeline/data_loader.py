from neo4j import GraphDatabase
import logging
import os
import tempfile
from typing import Optional, Dict, Any, List

class DataLoader:
    def __init__(self, config):
        self.driver = GraphDatabase.driver(config['url'], auth=(config['user'], config['password']))
        self.database_name = config.get('database', 'neo4j')
        logging.info("DataLoader initialized and Neo4j client connected.")

    def get_unprocessed_responses(self, limit: int = 10):
        """
        Fetches responses from Response nodes that have not yet
        been processed in the latest analysis run. This logic is a placeholder
        and should be refined.
        """
        logging.info("Fetching unprocessed responses...")
        # Query Neo4j for unprocessed responses
        cypher_query = """
        MATCH (r:Response)
        WHERE r.processed IS NULL OR r.processed = false
        RETURN r
        LIMIT $limit
        """

        with self.driver.session(database=self.database_name) as session:
            result = session.run(cypher_query, limit=limit)
            data = [dict(record["r"]) for record in result]
            logging.info(f"Found {len(data)} responses.")
            return data

    def get_experiment_session_for_response(self, response_id: str) -> Optional[Dict[str, Any]]:
        """
        Gets the experiment session associated with a response.
        This is needed to link responses to Hume AI analysis data.
        """
        try:
            logging.info(f"Finding experiment session for response {response_id}")
            cypher_query = """
            MATCH (r:Response {id: $response_id})-[:BELONGS_TO_SESSION]->(s:ExperimentSession)
            RETURN s
            """
            with self.driver.session(database=self.database_name) as session:
                result = session.run(cypher_query, response_id=response_id)
                record = result.single()
                if record:
                    return dict(record["s"])
                else:
                    logging.warning(f"No experiment session found for response {response_id}")
                    return None
        except Exception as e:
            logging.error(f"Error getting experiment session for response {response_id}: {e}")
            return None

    def get_participant_sessions(self, participant_id: str) -> List[Dict[str, Any]]:
        """参加者の実験セッションを取得"""
        try:
            cypher_query = """
            MATCH (p:Participant {id: $participant_id})-[:HAS_SESSION]->(s:ExperimentSession)
            RETURN s
            """
            with self.driver.session(database=self.database_name) as session:
                result = session.run(cypher_query, participant_id=participant_id)
                return [dict(record["s"]) for record in result]
        except Exception as e:
            logging.error(f"Failed to get participant sessions: {e}")
            return []

    def load_skin_potential_data(self, response_id: str) -> list:
        """
        Loads skin potential time-series data for a specific response.
        Queries PhysiologicalDataPoint nodes connected to the response.
        """
        logging.info(f"Loading skin potential data for response: {response_id}")
        try:
            cypher_query = """
            MATCH (r:Response {id: $response_id})-[:HAS_PHYSIOLOGICAL_DATA]->(p:PhysiologicalDataPoint)
            RETURN p
            ORDER BY p.timestamp_offset_ms
            """
            with self.driver.session(database=self.database_name) as session:
                result = session.run(cypher_query, response_id=response_id)
                data = [dict(record["p"]) for record in result]
                logging.info(f"Loaded {len(data)} physiological data points")
                return data
        except Exception as e:
            logging.error(f"Failed to load skin potential data: {e}")
            return []

    def download_media_file(self, storage_path: str, local_dir: Optional[str] = None) -> str:
        """
        Downloads a media file from a storage bucket.
        NOTE: This is a placeholder and needs to be implemented with a proper storage client.
        """
        if local_dir is None:
            local_dir = tempfile.gettempdir()
        filename = os.path.basename(storage_path)
        local_path = os.path.join(local_dir, filename)
        logging.warning(f"Placeholder: 'Downloading' {storage_path} to {local_path}. Not implemented.")
        # Create an empty file to simulate download
        with open(local_path, 'w') as f:
            f.write('')
        return local_path
