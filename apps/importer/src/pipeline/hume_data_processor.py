import pandas as pd
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
from arango import ArangoClient

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class HumeDataProcessor:
    """
    Loads pre-processed Hume AI emotion analysis data from the ArangoDB database.
    """

    def __init__(self, arangodb_config: Dict[str, str]):
        self.client = ArangoClient(hosts=arangodb_config['url'])
        self.db = self.client.db(arangodb_config['database'], username=arangodb_config['user'], password=arangodb_config['password'])
        logging.info("HumeDataProcessor initialized with ArangoDB client.")

    def load_burst_data(self, participant_experiment_session_id: str) -> List[Dict[str, Any]]:
        """Load burst prediction data directly for a given session."""
        try:
            aql_query = """
            FOR prediction IN participant_hume_burst_predictions
                FILTER prediction.participant_experiment_session_id == @session_id
                RETURN prediction
            """

            cursor = self.db.aql.execute(aql_query, bind_vars={"session_id": participant_experiment_session_id})
            data = list(cursor)

            logging.info(f"Loaded {len(data)} burst prediction records for session {participant_experiment_session_id}")
            return data
        except Exception as e:
            logging.error(f"Error loading burst data for session {participant_experiment_session_id}: {e}")
            return []

    def load_prosody_data(self, participant_experiment_session_id: str) -> List[Dict[str, Any]]:
        """Load prosody prediction data directly for a given session."""
        try:
            response = self.supabase.table('participant_hume_prosody_predictions').select('*').eq(
                'participant_experiment_session_id', participant_experiment_session_id
            ).execute()
            if response.data:
                logging.info(f"Loaded {len(response.data)} prosody prediction records for session {participant_experiment_session_id}")
                return response.data
            else:
                logging.warning(f"No prosody prediction data found for session {participant_experiment_session_id}")
                return []
        except Exception as e:
            logging.error(f"Error loading prosody data for session {participant_experiment_session_id}: {e}")
            return []

    def load_language_data(self, participant_experiment_session_id: str) -> List[Dict[str, Any]]:
        """Load language prediction data directly for a given session."""
        try:
            response = self.supabase.table('participant_hume_language_predictions').select('*').eq(
                'participant_experiment_session_id', participant_experiment_session_id
            ).execute()
            if response.data:
                logging.info(f"Loaded {len(response.data)} language prediction records for session {participant_experiment_session_id}")
                return response.data
            else:
                logging.warning(f"No language prediction data found for session {participant_experiment_session_id}")
                return []
        except Exception as e:
            logging.error(f"Error loading language data for session {participant_experiment_session_id}: {e}")
            return []

    def extract_burst_emotions(self, burst_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extract emotion time-series data from burst predictions.
        """
        emotion_timeseries = []

        for record in burst_data:
            begin_time = record.get('begin_time', 0)
            end_time = record.get('end_time', 0)
            emotions = record.get('emotions', {})
            expressions = record.get('expressions', {})

            # Calculate midpoint time
            midpoint_time = (begin_time + end_time) / 2

            # Combine emotions and expressions
            all_emotions = {}
            if isinstance(emotions, dict):
                all_emotions.update(emotions)
            elif isinstance(emotions, str):
                # Try to parse JSON string
                try:
                    import json
                    parsed_emotions = json.loads(emotions)
                    if isinstance(parsed_emotions, dict):
                        all_emotions.update(parsed_emotions)
                except:
                    pass

            if isinstance(expressions, dict):
                all_emotions.update(expressions)
            elif isinstance(expressions, str):
                # Try to parse JSON string
                try:
                    import json
                    parsed_expressions = json.loads(expressions)
                    if isinstance(parsed_expressions, dict):
                        all_emotions.update(parsed_expressions)
                except:
                    pass

            if all_emotions:
                emotion_timeseries.append({
                    "timestamp_offset_ms": int(midpoint_time * 1000),
                    "source": "hume_burst",
                    "emotion_data": all_emotions,
                    "begin_time": begin_time,
                    "end_time": end_time
                })

        logging.info(f"Extracted {len(emotion_timeseries)} burst emotion data points")
        return emotion_timeseries

    def extract_prosody_emotions(self, prosody_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extract emotion time-series data from prosody analysis.
        """
        emotion_timeseries = []

        for record in prosody_data:
            begin_time = record.get('begin_time', 0)
            end_time = record.get('end_time', 0)
            # Note: prosody table doesn't have confidence field based on schema
            emotions = record.get('emotions', {})

            # Use midpoint of time segment
            midpoint_time = (begin_time + end_time) / 2

            emotion_scores = {}
            if isinstance(emotions, dict):
                emotion_scores = emotions
            elif isinstance(emotions, str):
                # Try to parse JSON string
                try:
                    import json
                    emotion_scores = json.loads(emotions)
                except:
                    pass

            if emotion_scores:
                emotion_timeseries.append({
                    "timestamp_offset_ms": int(midpoint_time * 1000),
                    "source": "hume_prosody",
                    "emotion_data": emotion_scores,
                    "confidence": 1.0,  # Default confidence since field doesn't exist
                    "begin_time": begin_time,
                    "end_time": end_time
                })

        logging.info(f"Extracted {len(emotion_timeseries)} prosody emotion data points")
        return emotion_timeseries

    def extract_language_emotions(self, language_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extract emotion time-series data from language analysis.
        """
        emotion_timeseries = []

        for record in language_data:
            begin_time = record.get('begin_time', 0)
            end_time = record.get('end_time', 0)
            confidence = record.get('confidence', 0)
            emotions = record.get('emotions', {})
            text = record.get('text', '')

            midpoint_time = (begin_time + end_time) / 2 if begin_time and end_time else 0

            emotion_scores = {}
            if isinstance(emotions, dict):
                emotion_scores = emotions
            elif isinstance(emotions, str):
                # Try to parse JSON string
                try:
                    import json
                    emotion_scores = json.loads(emotions)
                except:
                    pass

            if emotion_scores:
                emotion_timeseries.append({
                    "timestamp_offset_ms": int(midpoint_time * 1000),
                    "source": "hume_language",
                    "emotion_data": emotion_scores,
                    "confidence": confidence,
                    "text": text,
                    "begin_time": begin_time,
                    "end_time": end_time
                })

        logging.info(f"Extracted {len(emotion_timeseries)} language emotion data points")
        return emotion_timeseries

    def combine_emotion_data(self, face_data: List[Dict], prosody_data: List[Dict], language_data: List[Dict]) -> List[Dict[str, Any]]:
        """
        Combine emotion data from different sources into a single time-series.
        """
        combined_data = face_data + prosody_data + language_data

        # Sort by timestamp
        combined_data.sort(key=lambda x: x['timestamp_offset_ms'])

        logging.info(f"Combined {len(combined_data)} total emotion data points")
        return combined_data

    def calculate_average_emotions(self, emotion_timeseries: List[Dict[str, Any]]) -> Dict[str, float]:
        """
        Calculate average emotion scores across all time points.
        """
        if not emotion_timeseries:
            return {}

        emotion_sums = {}
        emotion_counts = {}

        for data_point in emotion_timeseries:
            emotions = data_point.get('emotion_data', {})
            for emotion, score in emotions.items():
                if emotion not in emotion_sums:
                    emotion_sums[emotion] = 0
                    emotion_counts[emotion] = 0
                emotion_sums[emotion] += score
                emotion_counts[emotion] += 1

        averages = {}
        for emotion in emotion_sums:
            averages[emotion] = emotion_sums[emotion] / emotion_counts[emotion]

        logging.info(f"Calculated average scores for {len(averages)} emotions")
        return averages

    def process_hume_data_for_session(self, participant_experiment_session_id: str) -> Dict[str, Any]:
        """
        Process Hume AI data for a specific participant experiment session.
        """
        logging.info(f"Processing Hume AI data for session: {participant_experiment_session_id}")

        # Load data from all sources for this session
        burst_data = self.load_burst_data(participant_experiment_session_id)
        prosody_data = self.load_prosody_data(participant_experiment_session_id)
        language_data = self.load_language_data(participant_experiment_session_id)

        # Extract emotion time-series
        burst_emotions = self.extract_burst_emotions(burst_data)
        prosody_emotions = self.extract_prosody_emotions(prosody_data)
        language_emotions = self.extract_language_emotions(language_data)

        # Combine all emotion data (no face data since we don't have that in the current schema)
        combined_emotions = self.combine_emotion_data([], burst_emotions + prosody_emotions, language_emotions)

        # Calculate averages
        average_emotions = self.calculate_average_emotions(combined_emotions)

        results = {
            "burst_data_count": len(burst_emotions),
            "prosody_data_count": len(prosody_emotions),
            "language_data_count": len(language_emotions),
            "total_emotion_points": len(combined_emotions),
            "average_emotions": average_emotions,
            "emotion_timeseries": combined_emotions,
            "session_id": participant_experiment_session_id
        }

        logging.info(f"Processed Hume AI data for session {participant_experiment_session_id}: {results['total_emotion_points']} emotion data points")
        return results
