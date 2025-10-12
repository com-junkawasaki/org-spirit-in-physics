from arango import ArangoClient
import logging
import os
import tempfile
from typing import Optional, Dict, Any, List

class DataLoader:
    def __init__(self, config):
        self.client = ArangoClient(hosts=config['url'])
        self.db = self.client.db(config['database'], username=config['user'], password=config['password'])
        self.database_name = config['database']
        logging.info("DataLoader initialized and ArangoDB client connected.")

    def get_unprocessed_responses(self, limit: int = 10):
        """
        Fetches responses from participant_response_data that have not yet
        been processed in the latest analysis run. This logic is a placeholder
        and should be refined.
        """
        logging.info("Fetching unprocessed responses...")
        # Query ArangoDB for unprocessed responses
        aql_query = f"""
        FOR response IN participant_session_responses
            LIMIT {limit}
            RETURN response
        """

        cursor = self.db.aql.execute(aql_query)
        data = list(cursor)
        logging.info(f"Found {len(data)} responses.")
        return data

    def get_experiment_session_for_response(self, response_id: str) -> Optional[Dict[str, Any]]:
        """
        Gets the experiment session associated with a response.
        This is needed to link responses to Hume AI analysis data.
        """
        try:
            logging.info(f"Finding experiment session for response {response_id}")
            aql_query = """
            FOR response IN participant_session_responses
                FILTER response._key == @response_id
                FOR session IN participant_sessions
                    FILTER session._key == response.experiment_id
                    RETURN session
            """
            cursor = self.db.aql.execute(aql_query, bind_vars={"response_id": response_id})
            sessions = list(cursor)
            if sessions:
                return sessions[0]
            else:
                logging.warning(f"No experiment session found for response {response_id}")
                return None
        except Exception as e:
            logging.error(f"Error getting experiment session for response {response_id}: {e}")
            return None

    def get_participant_sessions(self, participant_id: str) -> List[Dict[str, Any]]:
        """参加者の実験セッションを取得"""
        try:
            aql_query = """
            FOR session IN participant_sessions
                FILTER session.participant_id == @participant_id
                RETURN session
            """
            cursor = self.db.aql.execute(aql_query, bind_vars={"participant_id": participant_id})
            return list(cursor)
        except Exception as e:
            logging.error(f"Failed to get participant sessions: {e}")
            return []

    def load_skin_potential_data(self, response_id: str) -> list:
        """
        Loads skin potential time-series data for a specific response.
        This is a placeholder and should be adapted for how skin potential is stored.
        """
        logging.info(f"Loading skin potential data for response: {response_id}")
        # This is a placeholder. In a real scenario, you would query a collection
        # that stores time-series data linked to the response_id.
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
