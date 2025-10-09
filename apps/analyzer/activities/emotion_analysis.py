"""
Temporal activity for emotion analysis.
"""

import sys
from pathlib import Path
from typing import Dict, Any, List
from temporalio import activity

# Add pipeline directory to path
sys.path.append(str(Path(__file__).parent.parent / 'pipeline'))

from pipeline.hume_data_processor import HumeDataProcessor
from shared.models import EmotionAnalysisResult, HumeDataSummary, EmotionStatistics, EmotionData
from .base import BaseActivity


class EmotionAnalysisActivity(BaseActivity):
    """Activity for processing Hume AI emotion data."""

    def __init__(self):
        super().__init__()
        self.hume_processor = HumeDataProcessor(self.config.supabase)

    @activity.defn
    async def process_emotion_data(self) -> EmotionAnalysisResult:
        """
        Process Hume AI emotion data and return comprehensive analysis.
        """
        self.logger.info("Starting Hume AI emotion data analysis...")

        # Process all Hume AI data
        hume_results = self.hume_processor.process_all_hume_data()

        # Calculate emotion statistics
        emotion_stats = self._calculate_emotion_statistics(hume_results)

        # Create comprehensive results
        results = EmotionAnalysisResult(
            hume_data_summary=HumeDataSummary(
                face_data_points=hume_results['face_data_count'],
                prosody_data_points=hume_results['prosody_data_count'],
                language_data_points=hume_results['language_data_count'],
                total_emotion_points=hume_results['total_emotion_points'],
                burst_events=hume_results['burst_data_count']
            ),
            emotion_statistics=emotion_stats,
            emotion_timeseries=[
                EmotionData(
                    timestamp_offset_ms=data['timestamp_offset_ms'],
                    source=data['source'],
                    emotion_data=data.get('emotion_data', {})
                ) for data in hume_results['emotion_timeseries']
            ],
            average_emotions=hume_results['average_emotions']
        )

        self.logger.info(f"Emotion analysis complete: {results.hume_data_summary.total_emotion_points} points")
        return results

    def _calculate_emotion_statistics(self, hume_results: Dict[str, Any]) -> Dict[str, EmotionStatistics]:
        """Calculate comprehensive emotion statistics."""
        emotion_timeseries = hume_results['emotion_timeseries']

        if not emotion_timeseries:
            return {}

        # Collect all emotion data by source
        face_emotions = [d for d in emotion_timeseries if d['source'] == 'hume_face']
        prosody_emotions = [d for d in emotion_timeseries if d['source'] == 'hume_prosody']
        language_emotions = [d for d in emotion_timeseries if d['source'] == 'hume_language']

        stats = {
            'by_source': {
                'face': self._stats_for_emotion_list(face_emotions),
                'prosody': self._stats_for_emotion_list(prosody_emotions),
                'language': self._stats_for_emotion_list(language_emotions)
            },
            'overall': self._stats_for_emotion_list(emotion_timeseries)
        }

        return stats

    def _stats_for_emotion_list(self, emotion_list: List[Dict[str, Any]]) -> EmotionStatistics:
        """Calculate statistics for a list of emotion data points."""
        if not emotion_list:
            return EmotionStatistics(
                count=0,
                duration_seconds=0,
                top_emotions={},
                dominant_emotion=None
            )

        # Calculate duration
        timestamps = [d['timestamp_offset_ms'] for d in emotion_list]
        duration_ms = max(timestamps) - min(timestamps) if timestamps else 0

        # Calculate dominant emotions (top 5 by average score)
        all_emotions = {}
        for data_point in emotion_list:
            for emotion, score in data_point.get('emotion_data', {}).items():
                if emotion not in all_emotions:
                    all_emotions[emotion] = []
                all_emotions[emotion].append(score)

        avg_emotions = {}
        for emotion, scores in all_emotions.items():
            avg_emotions[emotion] = sum(scores) / len(scores)

        # Sort by average score and take top 5
        top_emotions = sorted(avg_emotions.items(), key=lambda x: x[1], reverse=True)[:5]

        return EmotionStatistics(
            count=len(emotion_list),
            duration_seconds=duration_ms / 1000,
            top_emotions=dict(top_emotions),
            dominant_emotion=top_emotions[0][0] if top_emotions else None
        )
