from arango import ArangoClient
import logging

class DataStorer:
    def __init__(self, config):
        self.client = ArangoClient(hosts=config['url'])
        self.db = self.client.db(config['database'], username=config['user'], password=config['password'])
        logging.info("DataStorer initialized.")

    def create_analysis_run(self, model_version: str, parameters: dict, notes: str) -> str:
        """Logs a new analysis run and returns its ID."""
        logging.info(f"Creating new analysis run for model version {model_version}.")
        import uuid
        run_id = str(uuid.uuid4())

        collection = self.db.collection('analysis_runs')
        doc = {
            "_key": run_id,
            "id": run_id,
            "model_version": model_version,
            "parameters": parameters,
            "notes": notes,
            "created_at": "2024-01-01T00:00:00Z"  # TODO: Use proper timestamp
        }

        result = collection.insert(doc)
        logging.info(f"Analysis run created with ID: {run_id}")
        return run_id

    def store_emotion_data(self, response_id: str, emotion_timeseries: list):
        """Stores emotion time-series data."""
        logging.info(f"Storing emotion data for response ID: {response_id}")
        records = [
            {
                "response_id": response_id,
                "timestamp_offset_ms": item['timestamp_offset_ms'],
                "source": item.get('source', 'hume_ai'),
                "emotion_data": item['emotion_data']
            }
            for item in emotion_timeseries
        ]
        # Insert emotion data
        collection = self.db.collection('response_emotion_timeseries')
        for record in records:
            try:
                # Create unique key
                key = f"{response_id}_{record['source']}_{record['timestamp_offset_ms']}"
                record['_key'] = key
                result = collection.insert(record, overwrite=True)  # Use overwrite for upsert-like behavior
            except Exception as e:
                logging.warning(f"Exception storing emotion data for response {response_id}: {e}")
                # Continue with other records even if one fails

    def store_analysis_result(self, run_id: str, response_id: str, result: dict):
        """Stores the final result of a model calculation."""
        logging.info(f"Storing analysis result for response ID: {response_id}")

        # Extract components from nested structure
        components = result.get('components', {})
        record = {
            "run_id": run_id,
            "response_id": response_id,
            "p_value": result.get('p_value'),
            "word2vec_component": components.get('word2vec'),
            "reaction_time_component": components.get('reaction_time'),
            "skin_potential_component": components.get('skin_potential'),
            "emotion_component": components.get('emotion'),
            "raw_inputs": result  # Store full result as JSONB
        }
        try:
            collection = self.db.collection('analysis_results')
            # Create unique key
            record['_key'] = f"{response_id}_{run_id}"
            result = collection.insert(record)
            logging.info(f"Successfully stored analysis result for response {response_id}")
        except Exception as e:
            logging.error(f"Exception storing analysis result for response {response_id}: {e}")
