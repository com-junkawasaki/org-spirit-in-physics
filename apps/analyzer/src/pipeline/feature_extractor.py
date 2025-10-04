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

    def calculate_emotion_component(self, emotion_timeseries: list) -> float:
        """Calculates F(w_I, w_O)"""
        # Placeholder: Integrate emotion scores over the response window
        if not emotion_timeseries:
            return 0.0
        # Example: average joy score
        avg_joy = np.mean([item['emotion_data'].get('joy', 0) for item in emotion_timeseries])
        return avg_joy

    def extract_features_for_response(self, response_data, sp_timeseries, emotion_timeseries):
        logging.info(f"Extracting features for response ID {response_data['id']}")
        
        r = self.calculate_reaction_component(response_data['reaction_time_ms'])
        delta_sp = self.calculate_sp_component(sp_timeseries)
        f_emotion = self.calculate_emotion_component(emotion_timeseries)

        features = {
            "r": r,
            "delta_sp": delta_sp,
            "f_emotion": f_emotion,
            "stimulus_word": response_data['stimulus_word'],
            "response_word": response_data['response_word'],
        }
        logging.info(f"Extracted features: {features}")
        return features
