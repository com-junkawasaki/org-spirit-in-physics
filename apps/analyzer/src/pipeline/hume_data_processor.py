import pandas as pd
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
from supabase import create_client, Client

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class HumeDataProcessor:
    """
    Processes Hume AI emotion analysis data from Supabase database.
    """

    def __init__(self, supabase_config: Dict[str, str]):
        self.supabase: Client = create_client(supabase_config['url'], supabase_config['service_role_key'])
        self.emotion_columns = [
            'Admiration', 'Adoration', 'Aesthetic Appreciation', 'Amusement', 'Anger',
            'Anxiety', 'Awe', 'Awkwardness', 'Boredom', 'Calmness', 'Concentration',
            'Contemplation', 'Confusion', 'Contempt', 'Contentment', 'Craving',
            'Determination', 'Disappointment', 'Disgust', 'Distress', 'Doubt', 'Ecstasy',
            'Embarrassment', 'Empathic Pain', 'Entrancement', 'Envy', 'Excitement',
            'Fear', 'Guilt', 'Horror', 'Interest', 'Joy', 'Love', 'Nostalgia', 'Pain',
            'Pride', 'Realization', 'Relief', 'Romance', 'Sadness', 'Satisfaction',
            'Desire', 'Shame', 'Surprise (negative)', 'Surprise (positive)', 'Sympathy',
            'Tiredness', 'Triumph'
        ]

        logging.info("HumeDataProcessor initialized with Supabase client.")

    def load_burst_data(self, participant_experiment_session_id: str) -> List[Dict[str, Any]]:
        """Load burst prediction data from database."""
        try:
            job_id = self._get_job_id_for_session(participant_experiment_session_id)
            if not job_id:
                logging.warning(f"No Hume AI job found for session {participant_experiment_session_id}")
                return []

            response = self.supabase.table('participant_hume_burst_predictions').select('*').eq(
                'job_id', job_id
            ).execute()

            if response.data:
                logging.info(f"Loaded {len(response.data)} burst prediction records")
                return response.data
            else:
                logging.warning("No burst prediction data found")
                return []
        except Exception as e:
            logging.error(f"Error loading burst data: {e}")
            return []

    def load_prosody_data(self, participant_experiment_session_id: str) -> List[Dict[str, Any]]:
        """Load prosody prediction data from database."""
        try:
            job_id = self._get_job_id_for_session(participant_experiment_session_id)
            if not job_id:
                logging.warning(f"No Hume AI job found for session {participant_experiment_session_id}")
                return []

            response = self.supabase.table('participant_hume_prosody_predictions').select('*').eq(
                'job_id', job_id
            ).execute()

            if response.data:
                logging.info(f"Loaded {len(response.data)} prosody prediction records")
                return response.data
            else:
                logging.warning("No prosody prediction data found")
                return []
        except Exception as e:
            logging.error(f"Error loading prosody data: {e}")
            return []

    def load_language_data(self, participant_experiment_session_id: str) -> List[Dict[str, Any]]:
        """Load language prediction data from database."""
        try:
            job_id = self._get_job_id_for_session(participant_experiment_session_id)
            if not job_id:
                logging.warning(f"No Hume AI job found for session {participant_experiment_session_id}")
                return []

            response = self.supabase.table('participant_hume_language_predictions').select('*').eq(
                'job_id', job_id
            ).execute()

            if response.data:
                logging.info(f"Loaded {len(response.data)} language prediction records")
                return response.data
            else:
                logging.warning("No language prediction data found")
                return []
        except Exception as e:
            logging.error(f"Error loading language data: {e}")
            return []

    def _get_job_id_for_session(self, participant_experiment_session_id: str) -> str:
        """Get the Hume AI job ID for a given experiment session."""
        try:
            # First try direct match
            response = self.supabase.table('participant_hume_analysis_jobs').select('id').eq(
                'participant_experiment_session_id', participant_experiment_session_id
            ).eq('status', 'completed').execute()

            if response.data and len(response.data) > 0:
                return response.data[0]['id']

            # If no direct match, get participant_id and find any Hume job for that participant
            session_response = self.supabase.table('participant_experiment_sessions').select('participant_id').eq(
                'id', participant_experiment_session_id
            ).execute()

            if session_response.data and len(session_response.data) > 0:
                participant_id = session_response.data[0]['participant_id']

                # Find all experiment sessions for this participant
                all_sessions_response = self.supabase.table('participant_experiment_sessions').select('id').eq(
                    'participant_id', participant_id
                ).execute()

                if all_sessions_response.data:
                    session_ids = [s['id'] for s in all_sessions_response.data]

                    # Find Hume jobs for any of these sessions
                    job_response = self.supabase.table('participant_hume_analysis_jobs').select('id').in_(
                        'participant_experiment_session_id', session_ids
                    ).eq('status', 'completed').execute()

                    if job_response.data and len(job_response.data) > 0:
                        return job_response.data[0]['id']

            logging.warning(f"No completed Hume AI job found for session {participant_experiment_session_id}")
            return ""
        except Exception as e:
            logging.error(f"Error getting job ID for session {participant_experiment_session_id}: {e}")
            return ""

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
            if isinstance(expressions, dict):
                all_emotions.update(expressions)

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
            confidence = record.get('confidence', 0)
            emotions = record.get('emotions', {})

            # Use midpoint of time segment
            midpoint_time = (begin_time + end_time) / 2

            emotion_scores = {}
            if isinstance(emotions, dict):
                emotion_scores = emotions

            if emotion_scores:
                emotion_timeseries.append({
                    "timestamp_offset_ms": int(midpoint_time * 1000),
                    "source": "hume_prosody",
                    "emotion_data": emotion_scores,
                    "confidence": confidence,
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
