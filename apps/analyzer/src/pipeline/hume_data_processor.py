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
            FOR job IN participant_hume_analysis_jobs
                FILTER job.participant_experiment_session_id == @session_id
                FILTER job.status == "completed"
                RETURN job
            """

            cursor = self.db.aql.execute(aql_query, bind_vars={"session_id": session_id})
            results = list(cursor)

            if results:
                job = results[0]
                predictions = job.get("predictions", "{}")

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
                logging.info(f"No completed Hume jobs found for session {session_id}")
                return {"emotion_timeseries": []}

        except Exception as e:
            logging.error(f"Failed to process Hume data for session {session_id}: {e}")
            return {"emotion_timeseries": []}

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
