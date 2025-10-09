"""
Temporal activity for Kawasaki model analysis.
"""

import sys
from pathlib import Path
from typing import Dict, Any, List
from temporalio import activity

# Add pipeline directory to path
sys.path.append(str(Path(__file__).parent.parent / 'pipeline'))

from pipeline.kawasaki_model import KawasakiModel
from pipeline.feature_extractor import FeatureExtractor
from shared.models import (
    KawasakiResults, KawasakiAnalysisResult, OverallStatistics,
    EmotionIntegration, MockResponseData, EmotionAnalysisResult
)
from .base import BaseActivity


class KawasakiAnalysisActivity(BaseActivity):
    """Activity for running Kawasaki model analysis."""

    def __init__(self):
        super().__init__()
        self.kawasaki_model = KawasakiModel(
            self.config.model_params,
            self.config.word2vec
        )
        self.feature_extractor = FeatureExtractor(self.config.model_params)

    @activity.defn
    async def run_kawasaki_analysis(
        self,
        emotion_results: EmotionAnalysisResult,
        stimulus_words: List[str] = None
    ) -> KawasakiResults:
        """
        Run Kawasaki model analysis using Hume AI emotion data.
        """
        self.logger.info("Starting Kawasaki model analysis with Hume AI data...")

        if stimulus_words is None:
            # Default stimulus words from Jung test
            stimulus_words = [
                'head', 'green', 'water', 'stick', 'death', 'long', 'ship',
                'rich', 'marriage', 'house', 'tree', 'cold', 'mother', 'sing'
            ]

        # Create mock responses for each stimulus word with emotion data
        analysis_results = []

        for stimulus in stimulus_words:
            # Create multiple response variations for richer analysis
            response_variations = [
                f"{stimulus}_response_1",  # Mock response
                f"emotion_{stimulus}",     # Emotion-related response
                f"feeling_{stimulus}",     # Feeling-related response
            ]

            for response in response_variations:
                # Create mock response data
                mock_response = self.create_mock_response_data(
                    stimulus, response, reaction_time_ms=800 + len(stimulus) * 50
                )

                # Create mock physiological data (empty for now)
                sp_timeseries = []

                # Use Hume AI emotion data
                emotion_timeseries = [
                    {
                        'timestamp_offset_ms': data.timestamp_offset_ms,
                        'source': data.source,
                        'emotion_data': data.emotion_data
                    } for data in emotion_results.emotion_timeseries
                ]

                try:
                    # Extract features
                    features = self.feature_extractor.extract_features_for_response(
                        self._mock_response_to_dict(mock_response), sp_timeseries, emotion_timeseries
                    )

                    # Run Kawasaki model
                    kawasaki_result = self.kawasaki_model.calculate(features)

                    # Add metadata
                    result_with_metadata = KawasakiAnalysisResult(
                        p_value=kawasaki_result['p_value'],
                        spirit_probability=kawasaki_result.get('spirit_probability', kawasaki_result['p_value']),
                        confidence_interval=kawasaki_result.get('confidence_interval', [0.0, 1.0]),
                        stimulus_word=stimulus,
                        response_word=response,
                        analysis_type='hume_integrated',
                        emotion_data_points=len(emotion_timeseries)
                    )

                    analysis_results.append(result_with_metadata)

                    self.logger.info(f"Completed analysis for {stimulus} -> {response}: P-value = {kawasaki_result['p_value']:.4f}")
                except Exception as e:
                    self.logger.error(f"Failed to analyze {stimulus} -> {response}: {e}")

        # Calculate overall statistics
        if analysis_results:
            p_values = [r.p_value for r in analysis_results]
            overall_stats = OverallStatistics(
                total_analyses=len(analysis_results),
                avg_spirit_probability=sum(p_values) / len(p_values),
                max_spirit_probability=max(p_values),
                min_spirit_probability=min(p_values),
                high_spirit_responses=len([p for p in p_values if p > 0.8])
            )
        else:
            overall_stats = OverallStatistics(
                total_analyses=0,
                avg_spirit_probability=0.0,
                max_spirit_probability=0.0,
                min_spirit_probability=0.0,
                high_spirit_responses=0
            )

        results = KawasakiResults(
            individual_results=analysis_results,
            overall_statistics=overall_stats,
            emotion_integration=EmotionIntegration(
                total_emotion_points=len(emotion_results.emotion_timeseries),
                emotion_sources=list(set(d.source for d in emotion_results.emotion_timeseries))
            )
        )

        self.logger.info(f"Kawasaki analysis complete: {overall_stats.total_analyses} analyses")
        return results

    def create_mock_response_data(self, stimulus_word: str, response_word: str,
                                reaction_time_ms: int = 1000) -> MockResponseData:
        """
        Create mock response data for Kawasaki model analysis.
        Since we don't have real participant data, we'll create synthetic responses.
        """
        return MockResponseData(
            id=f'mock_response_{stimulus_word}_{response_word}',
            participant_id='hume_test_participant',
            experiment_id='hume_analysis_test',
            word_stimulus_id=1,  # Mock ID
            stimulus_word=stimulus_word,
            response_word=response_word,
            reaction_time_ms=reaction_time_ms,
            session='session-1',
            timestamp='2024-10-04T00:00:00Z',
            audio_file_path=None,
            video_file_path='hume_data/mock_video.mp4',  # Mock path
            skin_potential=0.0,  # Mock physiological data
            emotion='neutral',
            emotion_confidence=0.5
        )

    def _mock_response_to_dict(self, mock_response: MockResponseData) -> Dict[str, Any]:
        """Convert MockResponseData to dictionary for compatibility with existing code."""
        return {
            'id': mock_response.id,
            'participant_id': mock_response.participant_id,
            'experiment_id': mock_response.experiment_id,
            'word_stimulus_id': mock_response.word_stimulus_id,
            'stimulus_word': mock_response.stimulus_word,
            'response_word': mock_response.response_word,
            'reaction_time_ms': mock_response.reaction_time_ms,
            'session': mock_response.session,
            'timestamp': mock_response.timestamp,
            'audio_file_path': mock_response.audio_file_path,
            'video_file_path': mock_response.video_file_path,
            'skin_potential': mock_response.skin_potential,
            'emotion': mock_response.emotion,
            'emotion_confidence': mock_response.emotion_confidence
        }
