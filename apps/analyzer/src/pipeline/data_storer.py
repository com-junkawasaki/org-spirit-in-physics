from arango import ArangoClient
import logging
import uuid
from datetime import datetime

class DataStorer:
    """Data storer for analyzer using ArangoDB"""

    def __init__(self, config):
        self.client = ArangoClient(hosts=config['url'])
        self.db = self.client.db(config['database'], username=config['user'], password=config['password'])
        self.database_name = config['database']
        logging.info("DataStorer initialized and ArangoDB client connected.")

    def create_analysis_run(self, model_version, model_params, notes=""):
        """Create a new analysis run"""
        run_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()

        try:
            # Create analysis run document
            collection = self.db.collection("analysis_runs")
            doc = {
                "_key": run_id,
                "id": run_id,
                "model_version": model_version,
                "model_params": str(model_params),
                "notes": notes,
                "created_at": timestamp,
                "status": "running"
            }

            result = collection.insert(doc)
            logging.info(f"Created analysis run with ID: {run_id}")
            return run_id

        except Exception as e:
            logging.error(f"Failed to create analysis run: {e}")
            return None

    def store_emotion_data(self, response_id, emotion_timeseries_data):
        """Store emotion analysis data for a response"""
        try:
            # Store emotion data as JSON
            import json
            emotion_json = json.dumps(emotion_timeseries_data)

            # Update the response document with emotion data
            aql_query = """
            UPDATE @response_id WITH {
                emotion: @emotion_data
            } IN participant_session_responses
            """

            self.db.aql.execute(aql_query, bind_vars={
                "response_id": response_id,
                "emotion_data": emotion_json
            })

            logging.info(f"Stored emotion data for response {response_id}")

        except Exception as e:
            logging.error(f"Failed to store emotion data for response {response_id}: {e}")

    def store_analysis_result(self, run_id, response_id, result):
        """Store analysis result"""
        try:
            timestamp = datetime.now().isoformat()

            # Extract components from result
            p_value = result.get('p_value', 0.0)
            components = result.get('components', {})
            raw_inputs = result.get('raw_inputs', {})

            # Store analysis result document
            collection = self.db.collection("analysis_results")
            doc = {
                "_key": f"{response_id}_{run_id}",
                "id": f"{response_id}_{run_id}",
                "run_id": run_id,
                "response_id": response_id,
                "p_value": p_value,
                "word2vec_component": components.get('word2vec', 0.0),
                "reaction_time_component": components.get('reaction_time', 0.0),
                "skin_potential_component": components.get('skin_potential', 0.0),
                "emotion_component": components.get('emotion', 0.0),
                "raw_inputs": str(raw_inputs),
                "created_at": timestamp
            }

            result_query = collection.insert(doc)
            logging.info(f"Stored analysis result for response {response_id} in run {run_id}")

        except Exception as e:
            logging.error(f"Failed to store analysis result for response {response_id}: {e}")
