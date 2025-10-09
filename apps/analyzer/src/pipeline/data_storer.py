from terminusdb_client import WOQLClient, WOQLQuery
import logging
import uuid
from datetime import datetime

class DataStorer:
    def __init__(self, config):
        self.client = WOQLClient(
            server=config['url'],
            user=config['user'],
            password=config['password']
        )
        self.database_id = config['database_id']
        self.client.connect(self.database_id)
        logging.info("DataStorer initialized and TerminusDB connected.")

    def create_analysis_run(self, model_version: str, parameters: dict, notes: str) -> str:
        """Logs a new analysis run and returns its ID."""
        logging.info(f"Creating new analysis run for model version {model_version}.")

        run_id = str(uuid.uuid4())
        run_iri = f"terminusdb:///data/AnalysisRun/{run_id}"

        run_doc = {
            "@type": "AnalysisRun",
            "@id": run_iri,
            "id": run_id,
            "model_version": model_version,
            "parameters": str(parameters),  # Store as string for now
            "notes": notes,
            "status": "running",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        try:
            query = WOQLQuery().insert(run_doc)
            self.client.query(query)
            logging.info(f"Analysis run created with ID: {run_id}")
            return run_id
        except Exception as e:
            logging.error(f"Failed to create analysis run: {e}")
            raise Exception("Could not create analysis run in TerminusDB.")

    def store_emotion_data(self, response_id: str, emotion_timeseries: list):
        """Stores emotion time-series data."""
        logging.info(f"Storing emotion data for response ID: {response_id}")

        response_iri = f"terminusdb:///data/ResponseData/{response_id}"

        for item in emotion_timeseries:
            emotion_id = f"emotion_{response_id}_{item['timestamp_offset_ms']}"
            emotion_iri = f"terminusdb:///data/EmotionData/{emotion_id}"

            emotion_doc = {
                "@type": "EmotionData",
                "@id": emotion_iri,
                "id": emotion_id,
                "response_id": response_id,
                "timestamp_offset_ms": item['timestamp_offset_ms'],
                "source": item.get('source', 'hume_ai'),
                "emotion_data": str(item['emotion_data']),  # Store as string
                "belongs_to_response": response_iri,
                "created_at": datetime.now().isoformat()
            }

            try:
                query = WOQLQuery().woql_and(
                    WOQLQuery().insert(emotion_doc),
                    WOQLQuery().link(response_iri, "has_emotion_data", emotion_iri)
                )
                self.client.query(query)
            except Exception as e:
                logging.warning(f"Exception storing emotion data for response {response_id}: {e}")
                # Continue with other records even if one fails

    def store_analysis_result(self, run_id: str, response_id: str, result: dict):
        """Stores the final result of a model calculation."""
        logging.info(f"Storing analysis result for response ID: {response_id}")

        # Extract components from nested structure
        components = result.get('components', {})

        result_id = str(uuid.uuid4())
        result_iri = f"terminusdb:///data/AnalysisResult/{result_id}"
        run_iri = f"terminusdb:///data/AnalysisRun/{run_id}"
        response_iri = f"terminusdb:///data/ResponseData/{response_id}"

        result_doc = {
            "@type": "AnalysisResult",
            "@id": result_iri,
            "id": result_id,
            "p_value": result.get('p_value'),
            "word2vec_component": components.get('word2vec'),
            "reaction_time_component": components.get('reaction_time'),
            "skin_potential_component": components.get('skin_potential'),
            "emotion_component": components.get('emotion'),
            "raw_inputs": str(result),  # Store full result as string
            "belongs_to_run": run_iri,
            "belongs_to_response": response_iri,
            "created_at": datetime.now().isoformat()
        }

        # Remove None values
        result_doc = {k: v for k, v in result_doc.items() if v is not None}

        try:
            query = WOQLQuery().woql_and(
                WOQLQuery().insert(result_doc),
                WOQLQuery().link(run_iri, "has_result", result_iri),
                WOQLQuery().link(response_iri, "has_analysis_result", result_iri)
            )
            self.client.query(query)
            logging.info(f"Successfully stored analysis result for response {response_id}")
        except Exception as e:
            logging.error(f"Exception storing analysis result for response {response_id}: {e}")
