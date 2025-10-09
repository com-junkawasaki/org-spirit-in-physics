from terminusdb_client import WOQLClient, WOQLQuery
import logging
import uuid
from datetime import datetime

class DataStorer:
    """Data storer for analyzer using TerminusDB"""

    def __init__(self, config):
        self.client = WOQLClient(
            server=config['url'],
            user=config['user'],
            password=config['password']
        )
        self.database_id = config['database_id']
        self.client.connect(self.database_id)
        logging.info("DataStorer initialized and TerminusDB client connected.")

    def create_analysis_run(self, model_version, model_params, notes=""):
        """Create a new analysis run"""
        run_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()

        try:
            # Create analysis run node
            query = WOQLQuery().woql_and(
                WOQLQuery().insert(f"terminusdb:///data/AnalysisRun/{run_id}", "rdf:type", "scm:AnalysisRun"),
                WOQLQuery().insert(f"terminusdb:///data/AnalysisRun/{run_id}", "scm:id", run_id),
                WOQLQuery().insert(f"terminusdb:///data/AnalysisRun/{run_id}", "scm:model_version", model_version),
                WOQLQuery().insert(f"terminusdb:///data/AnalysisRun/{run_id}", "scm:model_params", str(model_params)),
                WOQLQuery().insert(f"terminusdb:///data/AnalysisRun/{run_id}", "scm:notes", notes),
                WOQLQuery().insert(f"terminusdb:///data/AnalysisRun/{run_id}", "scm:created_at", timestamp)
            )

            result = self.client.query(query)
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

            query = WOQLQuery().woql_and(
                WOQLQuery().insert(f"terminusdb:///data/ResponseData/{response_id}", "scm:emotion_data", emotion_json)
            )

            result = self.client.query(query)
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

            query = WOQLQuery().woql_and(
                WOQLQuery().insert(f"terminusdb:///data/AnalysisResult/{response_id}_{run_id}", "rdf:type", "scm:AnalysisResult"),
                WOQLQuery().insert(f"terminusdb:///data/AnalysisResult/{response_id}_{run_id}", "scm:id", f"{response_id}_{run_id}"),
                WOQLQuery().insert(f"terminusdb:///data/AnalysisResult/{response_id}_{run_id}", "belongs_to_run", f"terminusdb:///data/AnalysisRun/{run_id}"),
                WOQLQuery().insert(f"terminusdb:///data/AnalysisResult/{response_id}_{run_id}", "belongs_to_response", f"terminusdb:///data/ResponseData/{response_id}"),
                WOQLQuery().insert(f"terminusdb:///data/AnalysisResult/{response_id}_{run_id}", "scm:p_value", p_value),
                WOQLQuery().insert(f"terminusdb:///data/AnalysisResult/{response_id}_{run_id}", "scm:word2vec_component", components.get('word2vec', 0.0)),
                WOQLQuery().insert(f"terminusdb:///data/AnalysisResult/{response_id}_{run_id}", "scm:reaction_time_component", components.get('reaction_time', 0.0)),
                WOQLQuery().insert(f"terminusdb:///data/AnalysisResult/{response_id}_{run_id}", "scm:skin_potential_component", components.get('skin_potential', 0.0)),
                WOQLQuery().insert(f"terminusdb:///data/AnalysisResult/{response_id}_{run_id}", "scm:emotion_component", components.get('emotion', 0.0)),
                WOQLQuery().insert(f"terminusdb:///data/AnalysisResult/{response_id}_{run_id}", "scm:raw_inputs", str(raw_inputs)),
                WOQLQuery().insert(f"terminusdb:///data/AnalysisResult/{response_id}_{run_id}", "scm:created_at", timestamp)
            )

            result_query = self.client.query(query)
            logging.info(f"Stored analysis result for response {response_id} in run {run_id}")

        except Exception as e:
            logging.error(f"Failed to store analysis result for response {response_id}: {e}")
