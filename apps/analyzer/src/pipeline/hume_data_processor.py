import logging
from arango import ArangoClient

class HumeDataProcessor:
    """Processor for Hume AI data stored in ArangoDB"""

    def __init__(self, config):
        self.client = ArangoClient(hosts=config['url'])
        self.db = self.client.db(config['database'], username=config['user'], password=config['password'])
        self.database_name = config['database']
        logging.info("HumeDataProcessor initialized")

    def process_hume_data_for_session(self, session_id):
        """Process Hume AI data for a given experiment session"""
        try:
            # Query Hume analysis jobs for this session using AQL
            aql_query = """
            FOR job IN analysis_runs
                FILTER job.analysis_type == "hume_ai"
                FILTER job.participant_session_id == @session_id
                FILTER job.status == "completed"
                RETURN job
            """

            cursor = self.db.aql.execute(aql_query, bind_vars={"session_id": session_id})
            results = list(cursor)

            if results:
                job = results[0]
                # Get Hume predictions from analysis_results collection
                predictions = self._get_hume_predictions(job["id"])

                if predictions:
                    # Parse predictions JSON
                    import json
                    predictions_data = json.loads(predictions)

                    # Extract emotion timeseries
                    emotion_timeseries = self._extract_emotion_timeseries(predictions_data)

                    logging.info(f"Processed Hume data for session {session_id}: {len(emotion_timeseries)} emotion points")
                    return {
                        "emotion_timeseries": emotion_timeseries
                    }
                else:
                    logging.info(f"No Hume predictions found for job {job['id']}")
                    return {"emotion_timeseries": []}
            else:
                logging.info(f"No completed Hume jobs found for session {session_id}")
                return {"emotion_timeseries": []}

        except Exception as e:
            logging.error(f"Failed to process Hume data for session {session_id}: {e}")
            return {"emotion_timeseries": []}

    def _get_hume_predictions(self, job_id):
        """Get Hume predictions data for a job"""
        try:
            aql_query = """
            FOR result IN analysis_results
                FILTER result.analysis_run_id == @job_id
                FILTER result.prediction_type == "language" OR result.prediction_type == "burst" OR result.prediction_type == "prosody"
                SORT result.data.begin_time ASC
                RETURN result
            """

            cursor = self.db.aql.execute(aql_query, bind_vars={"job_id": job_id})
            results = list(cursor)

            if results:
                # Combine all predictions into a single structure
                combined_predictions = []
                for result in results:
                    combined_predictions.append(result["data"])

                import json
                return json.dumps({"results": [{"predictions": combined_predictions}]})
            else:
                return None

        except Exception as e:
            logging.error(f"Failed to get Hume predictions for job {job_id}: {e}")
            return None

    def _extract_emotion_timeseries(self, predictions_data):
        """Extract emotion timeseries from Hume predictions"""
        emotion_timeseries = []

        # Simplified extraction - in real implementation this would parse
        # the actual Hume AI response format
        try:
            # Mock extraction for now
            if isinstance(predictions_data, dict):
                # Look for emotion data in predictions
                if "results" in predictions_data:
                    for result in predictions_data["results"]:
                        if "predictions" in result:
                            for prediction in result["predictions"]:
                                if "emotions" in prediction:
                                    timestamp = prediction.get("time", {}).get("begin", 0) / 1000.0  # Convert to seconds
                                    emotions = prediction["emotions"]
                                    emotion_timeseries.append({
                                        "timestamp": timestamp,
                                        "emotions": emotions
                                    })
        except Exception as e:
            logging.warning(f"Failed to extract emotion timeseries: {e}")

        return emotion_timeseries
