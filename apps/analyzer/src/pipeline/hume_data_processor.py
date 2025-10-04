import pandas as pd
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class HumeDataProcessor:
    """
    Processes Hume AI emotion analysis data from CSV files and JSON predictions.
    """

    def __init__(self, data_dir: str = "apps/analyzer/hume_data"):
        self.data_dir = Path(data_dir)
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

        logging.info(f"HumeDataProcessor initialized with data directory: {self.data_dir}")

    def load_face_data(self, csv_path: Optional[str] = None) -> pd.DataFrame:
        """Load facial emotion analysis data."""
        if csv_path is None:
            # Find the face CSV file
            face_csv = self._find_csv_file('face.csv')
        else:
            face_csv = Path(csv_path)

        if not face_csv.exists():
            logging.warning(f"Face data file not found: {face_csv}")
            return pd.DataFrame()

        logging.info(f"Loading face data from: {face_csv}")
        df = pd.read_csv(face_csv)
        logging.info(f"Loaded {len(df)} face data rows")
        return df

    def load_prosody_data(self, csv_path: Optional[str] = None) -> pd.DataFrame:
        """Load vocal emotion analysis data."""
        if csv_path is None:
            prosody_csv = self._find_csv_file('prosody.csv')
        else:
            prosody_csv = Path(csv_path)

        if not prosody_csv.exists():
            logging.warning(f"Prosody data file not found: {prosody_csv}")
            return pd.DataFrame()

        logging.info(f"Loading prosody data from: {prosody_csv}")
        df = pd.read_csv(prosody_csv)
        logging.info(f"Loaded {len(df)} prosody data rows")
        return df

    def load_language_data(self, csv_path: Optional[str] = None) -> pd.DataFrame:
        """Load language emotion analysis data."""
        if csv_path is None:
            language_csv = self._find_csv_file('language.csv')
        else:
            language_csv = Path(csv_path)

        if not language_csv.exists():
            logging.warning(f"Language data file not found: {language_csv}")
            return pd.DataFrame()

        logging.info(f"Loading language data from: {language_csv}")
        df = pd.read_csv(language_csv)
        logging.info(f"Loaded {len(df)} language data rows")
        return df

    def load_burst_data(self, csv_path: Optional[str] = None) -> pd.DataFrame:
        """Load emotion burst data."""
        if csv_path is None:
            burst_csv = self._find_csv_file('burst.csv')
        else:
            burst_csv = Path(csv_path)

        if not burst_csv.exists():
            logging.warning(f"Burst data file not found: {burst_csv}")
            return pd.DataFrame()

        logging.info(f"Loading burst data from: {burst_csv}")
        df = pd.read_csv(burst_csv)
        logging.info(f"Loaded {len(df)} burst data rows")
        return df

    def _find_csv_file(self, filename: str) -> Path:
        """Find CSV file in the data directory structure."""
        # Look in the registry directory first
        registry_dirs = list(self.data_dir.glob("registry_file-*"))
        if registry_dirs:
            # Try the nested path structure
            csv_file = registry_dirs[0] / "csv" / registry_dirs[0].name / filename
            if csv_file.exists():
                return csv_file

        # Fallback to direct search in data directory
        csv_file = self.data_dir / filename
        if csv_file.exists():
            return csv_file

        # Try searching in the csv subdirectory
        csv_dir = self.data_dir / "csv"
        if csv_dir.exists():
            registry_subdirs = list(csv_dir.glob("*"))
            if registry_subdirs:
                csv_file = registry_subdirs[0] / filename
                if csv_file.exists():
                    return csv_file

        # Return the expected path even if it doesn't exist
        if registry_dirs:
            return registry_dirs[0] / "csv" / registry_dirs[0].name / filename
        else:
            return self.data_dir / filename

    def extract_face_emotions(self, face_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Extract emotion time-series data from face analysis.
        Returns list of emotion data points with timestamps.
        """
        emotion_timeseries = []

        if face_df.empty:
            return emotion_timeseries

        for _, row in face_df.iterrows():
            frame_time = row.get('Time', 0)
            probability = row.get('Probability', 0)

            # Skip low-confidence detections
            if probability < 0.5:
                continue

            emotion_scores = {}
            for emotion in self.emotion_columns:
                if emotion in row:
                    emotion_scores[emotion.lower().replace(' ', '_').replace('(', '').replace(')', '')] = float(row[emotion])

            if emotion_scores:
                emotion_timeseries.append({
                    "timestamp_offset_ms": int(frame_time * 1000),
                    "source": "hume_face",
                    "emotion_data": emotion_scores,
                    "confidence": probability
                })

        logging.info(f"Extracted {len(emotion_timeseries)} face emotion data points")
        return emotion_timeseries

    def extract_prosody_emotions(self, prosody_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Extract emotion time-series data from prosody analysis.
        """
        emotion_timeseries = []

        if prosody_df.empty:
            return emotion_timeseries

        for _, row in prosody_df.iterrows():
            begin_time = row.get('BeginTime', 0)
            end_time = row.get('EndTime', 0)
            confidence = row.get('Confidence', 0)

            # Use midpoint of time segment
            midpoint_time = (begin_time + end_time) / 2

            emotion_scores = {}
            for emotion in self.emotion_columns:
                if emotion in row:
                    emotion_scores[emotion.lower().replace(' ', '_').replace('(', '').replace(')', '')] = float(row[emotion])

            if emotion_scores:
                emotion_timeseries.append({
                    "timestamp_offset_ms": int(midpoint_time * 1000),
                    "source": "hume_prosody",
                    "emotion_data": emotion_scores,
                    "confidence": confidence,
                    "text": row.get('Text', ''),
                    "begin_time": begin_time,
                    "end_time": end_time
                })

        logging.info(f"Extracted {len(emotion_timeseries)} prosody emotion data points")
        return emotion_timeseries

    def extract_language_emotions(self, language_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Extract emotion time-series data from language analysis.
        """
        emotion_timeseries = []

        if language_df.empty:
            return emotion_timeseries

        for _, row in language_df.iterrows():
            begin_time = row.get('BeginTime', 0)
            end_time = row.get('EndTime', 0)
            confidence = row.get('Confidence', 0)

            midpoint_time = (begin_time + end_time) / 2

            emotion_scores = {}
            for emotion in self.emotion_columns:
                if emotion in row:
                    emotion_scores[emotion.lower().replace(' ', '_').replace('(', '').replace(')', '')] = float(row[emotion])

            if emotion_scores:
                emotion_timeseries.append({
                    "timestamp_offset_ms": int(midpoint_time * 1000),
                    "source": "hume_language",
                    "emotion_data": emotion_scores,
                    "confidence": confidence,
                    "text": row.get('Text', ''),
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

    def process_all_hume_data(self) -> Dict[str, Any]:
        """
        Process all available Hume AI data and return comprehensive results.
        """
        logging.info("Processing all Hume AI data...")

        # Load data from all sources
        face_df = self.load_face_data()
        prosody_df = self.load_prosody_data()
        language_df = self.load_language_data()
        burst_df = self.load_burst_data()

        # Extract emotion time-series
        face_emotions = self.extract_face_emotions(face_df)
        prosody_emotions = self.extract_prosody_emotions(prosody_df)
        language_emotions = self.extract_language_emotions(language_df)

        # Combine all emotion data
        combined_emotions = self.combine_emotion_data(face_emotions, prosody_emotions, language_emotions)

        # Calculate averages
        average_emotions = self.calculate_average_emotions(combined_emotions)

        results = {
            "face_data_count": len(face_emotions),
            "prosody_data_count": len(prosody_emotions),
            "language_data_count": len(language_emotions),
            "total_emotion_points": len(combined_emotions),
            "average_emotions": average_emotions,
            "emotion_timeseries": combined_emotions,
            "burst_data_count": len(burst_df) if not burst_df.empty else 0
        }

        logging.info(f"Processed Hume AI data: {results['total_emotion_points']} emotion data points")
        return results
