from arango import ArangoClient
import logging
import os
import yaml

class DataLoader:
    """Data loader for analyzer using ArangoDB"""

    def __init__(self, config):
        self.client = ArangoClient(hosts=config['url'])
        self.db = self.client.db(config['database'], username=config['user'], password=config['password'])
        self.database_name = config['database']
        logging.info("DataLoader initialized and ArangoDB client connected.")

    def get_unprocessed_responses(self, limit=100):
        """Get responses that haven't been processed yet"""
        try:
            aql_query = f"""
            FOR response IN participant_session_responses
                LIMIT {limit}
                RETURN response
            """

            result = list(self.db.aql.execute(aql_query))

            logging.info(f"Found {len(result)} responses.")
            return result

        except Exception as e:
            logging.error(f"Failed to fetch unprocessed responses: {e}")
            return []

    def get_experiment_session_for_response(self, response_id):
        """Get experiment session for a given response"""
        try:
            aql_query = """
            FOR response IN participant_session_responses
                FILTER response.id == @response_id
                FOR session IN participant_sessions
                    FILTER session.id == response.experiment_id
                    FOR participant IN participants
                        FILTER participant.id == response.participant_id
                        RETURN {
                            id: session.id,
                            session_type: session.session_type,
                            start_time: session.start_time,
                            end_time: session.end_time,
                            participant_id: participant.id
                        }
            """

            cursor = self.db.aql.execute(aql_query, bind_vars={"response_id": response_id})
            results = list(cursor)

            if results:
                return results[0]
            else:
                logging.warning(f"No experiment session found for response {response_id}")
                return None

        except Exception as e:
            logging.error(f"Failed to fetch experiment session for response {response_id}: {e}")
            return None

    def get_response(self, response_id):
        """Get response data by ID"""
        try:
            aql_query = """
            FOR response IN participant_session_responses
                FILTER response.id == @response_id
                RETURN {
                    id: response.id,
                    stimulus_word: response.stimulus_word,
                    response_word: response.response_word,
                    audio_file_path: response.audio_file_path,
                    video_file_path: response.video_file_path,
                    participant_id: response.participant_id
                }
            """

            cursor = self.db.aql.execute(aql_query, bind_vars={"response_id": response_id})
            results = list(cursor)

            if results:
                return results[0]
            else:
                logging.warning(f"Response {response_id} not found.")
                return None

        except Exception as e:
            logging.error(f"Failed to fetch response {response_id}: {e}")
            return None

    def load_skin_potential_data(self, response_id):
        """Load skin potential timeseries data for a response"""
        try:
            # For now, return the skin_potential value directly from the response
            # In the future, this could be extended to handle time-series data
            aql_query = """
            FOR response IN participant_session_responses
                FILTER response.id == @response_id AND response.skin_potential != null
                RETURN response.skin_potential
            """

            cursor = self.db.aql.execute(aql_query, bind_vars={"response_id": response_id})
            results = list(cursor)

            if results and results[0] is not None:
                skin_potential = results[0]
                logging.info(f"Loaded skin potential data for response {response_id}")
                return [{"value": float(skin_potential), "timestamp_offset_ms": 0}]
            else:
                logging.info(f"No skin potential data found for response {response_id}")
                return []

        except Exception as e:
            logging.error(f"Failed to load skin potential data for response {response_id}: {e}")
            return []
