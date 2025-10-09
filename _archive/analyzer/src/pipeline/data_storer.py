from supabase import create_client, Client
import logging

class DataStorer:
    def __init__(self, config):
        self.supabase: Client = create_client(config['url'], config['service_role_key'])
        logging.info("DataStorer initialized.")

    def create_analysis_run(self, model_version: str, parameters: dict, notes: str) -> str:
        """Logs a new analysis run and returns its ID."""
        logging.info(f"Creating new analysis run for model version {model_version}.")
        response = self.supabase.table('analysis_runs').insert({
            "model_version": model_version,
            "parameters": parameters,
            "notes": notes
        }).execute()
        
        if response.data:
            run_id = response.data[0]['id']
            logging.info(f"Analysis run created with ID: {run_id}")
            return run_id
        else:
            logging.error(f"Failed to create analysis run. Error: {response.error}")
            raise Exception("Could not create analysis run in Supabase.")

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
        # Use upsert to handle duplicates
        for record in records:
            try:
                response = self.supabase.table('response_emotion_timeseries').upsert(
                    record, on_conflict="response_id,source,timestamp_offset_ms"
                ).execute()
                if hasattr(response, 'error') and response.error:
                    logging.warning(f"Failed to store emotion data point for response {response_id}: {response.error}")
                elif not response.data:
                    logging.warning(f"No data returned when storing emotion data for response {response_id}")
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
            response = self.supabase.table('analysis_results').insert(record).execute()
            if hasattr(response, 'error') and response.error:
                logging.error(f"Failed to store analysis result for response {response_id}. Error: {response.error}")
            elif not response.data:
                logging.warning(f"No data returned when storing analysis result for response {response_id}")
            else:
                logging.info(f"Successfully stored analysis result for response {response_id}")
        except Exception as e:
            logging.error(f"Exception storing analysis result for response {response_id}: {e}")
