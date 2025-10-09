import logging
from terminusdb_client import WOQLQuery

class HumeDataProcessor:
    """Processor for Hume AI data stored in TerminusDB"""

    def __init__(self, config):
        from terminusdb_client import WOQLClient
        self.client = WOQLClient(
            server=config['url'],
            user=config['user'],
            password=config['password']
        )
        self.database_id = config['database_id']
        self.client.connect(self.database_id)
        logging.info("HumeDataProcessor initialized")

    def process_hume_data_for_session(self, session_id):
        """Process Hume AI data for a given experiment session"""
        try:
            # Query Hume analysis jobs for this session
            query = WOQLQuery().woql_and(
                WOQLQuery().triple("v:Job", "rdf:type", "scm:HumeAnalysisJob"),
                WOQLQuery().triple("v:Job", "belongs_to_session", f"terminusdb:///data/ExperimentSession/{session_id}"),
                WOQLQuery().triple("v:Job", "scm:status", "COMPLETED"),
                WOQLQuery().triple("v:Job", "scm:predictions", "v:Predictions")
            )

            result = self.client.query(query)

            if result.get("bindings") and len(result["bindings"]) > 0:
                binding = result["bindings"][0]
                predictions = binding.get("Predictions", {}).get("@value", "{}")

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
