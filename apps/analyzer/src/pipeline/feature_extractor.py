import numpy as np
import logging

class FeatureExtractor:
    def __init__(self, params):
        self.params = params
        logging.info("FeatureExtractor initialized.")

    def calculate_reaction_component(self, reaction_time_ms: int) -> float:
        """Calculates r(w_I, w_O)"""
        reaction_time_sec = reaction_time_ms / 1000.0
        r = 1 / (reaction_time_sec + self.params['epsilon'])
        return r

    def calculate_sp_component(self, sp_timeseries: list) -> float:
        """Calculates ΔSP(w_I, w_O)"""
        # Placeholder: Calculate the change (e.g., max - baseline)
        if not sp_timeseries:
            return 0.0
        values = [item['value'] for item in sp_timeseries]
        delta_sp = np.max(values) - values[0] if values else 0.0
        return delta_sp

    def calculate_emotion_component(self, emotion_timeseries: list) -> dict:
        """Calculates comprehensive emotion features F(w_I, w_O)"""
        if not emotion_timeseries:
            return {
                'joy': 0.0, 'sadness': 0.0, 'anger': 0.0, 'fear': 0.0,
                'surprise': 0.0, 'disgust': 0.0, 'contempt': 0.0,
                'emotional_valence': 0.0, 'emotional_intensity': 0.0
            }

        # 各感情の平均値を計算
        emotion_sums = {
            'joy': [], 'sadness': [], 'anger': [], 'fear': [],
            'surprise': [], 'disgust': [], 'contempt': []
        }

        for item in emotion_timeseries:
            emotion_data = item.get('emotion_data', {})
            for emotion in emotion_sums.keys():
                emotion_sums[emotion].append(emotion_data.get(emotion, 0))

        # 平均値を計算
        emotion_features = {}
        for emotion, values in emotion_sums.items():
            emotion_features[emotion] = np.mean(values) if values else 0.0

        # 感情の価（valence）と強度（intensity）を計算
        positive_emotions = emotion_features['joy'] + emotion_features['surprise']
        negative_emotions = emotion_features['sadness'] + emotion_features['anger'] + emotion_features['fear'] + emotion_features['disgust'] + emotion_features['contempt']

        emotion_features['emotional_valence'] = positive_emotions - negative_emotions
        emotion_features['emotional_intensity'] = abs(emotion_features['emotional_valence'])

        return emotion_features

    def extract_features_for_response(self, response_data, sp_timeseries, emotion_timeseries):
        logging.info(f"Extracting features for response ID {response_data['id']}")

        r = self.calculate_reaction_component(response_data['reaction_time_ms'])
        delta_sp = self.calculate_sp_component(sp_timeseries)
        emotion_features = self.calculate_emotion_component(emotion_timeseries)

        features = {
            "r": r,
            "delta_sp": delta_sp,
            "reaction_time_ms": response_data['reaction_time_ms'],
            "stimulus_word": response_data['stimulus_word'],
            "response_word": response_data['response_word'],
            "participant_id": response_data['participant_id'],
            "emotion_features": emotion_features,
            "physiological_features": {
                "delta_sp": delta_sp,
                "has_sp_data": len(sp_timeseries) > 0,
                "sp_data_points": len(sp_timeseries)
            }
        }

        # 感情データを個別に追加
        features.update(emotion_features)

        logging.info(f"Extracted features for {response_data['stimulus_word']} -> {response_data['response_word']}: Spirit components integrated")
        return features
