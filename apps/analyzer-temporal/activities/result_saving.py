"""
Temporal activity for saving analysis results.
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any
from temporalio import activity

# Add pipeline directory to path
sys.path.append(str(Path(__file__).parent.parent / 'pipeline'))

from visualization.spirit_visualizer import SpiritVisualizer
from shared.models import EmotionAnalysisResult, KawasakiResults, AnalysisResults
from .base import BaseActivity


class ResultSavingActivity(BaseActivity):
    """Activity for saving analysis results to files."""

    @activity.defn
    async def save_results(
        self,
        emotion_results: EmotionAnalysisResult,
        kawasaki_results: KawasakiResults,
        report_content: str,
        output_dir: str = None
    ) -> Dict[str, str]:
        """
        Save analysis results to files.
        """
        if output_dir is None:
            output_dir = self.config.output.results_dir

        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)

        # Save emotion results
        emotion_file = output_path / "hume_emotion_analysis.json"
        with open(emotion_file, 'w', encoding='utf-8') as f:
            json.dump(self._emotion_result_to_dict(emotion_results), f, indent=2, ensure_ascii=False)
        self.logger.info(f"Saved emotion analysis to {emotion_file}")

        # Save Kawasaki results
        kawasaki_file = output_path / "kawasaki_analysis.json"
        with open(kawasaki_file, 'w', encoding='utf-8') as f:
            json.dump(self._kawasaki_result_to_dict(kawasaki_results), f, indent=2, ensure_ascii=False)
        self.logger.info(f"Saved Kawasaki analysis to {kawasaki_file}")

        # Save report
        report_file = output_path / "analysis_report.md"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report_content)
        self.logger.info(f"Saved analysis report to {report_file}")

        # Create visualization if visualizer is available
        visualization_file = None
        try:
            visualizer = SpiritVisualizer(str(output_path))
            visualizer.save_all_visualizations(
                "hume_analysis",
                [self._kawasaki_result_to_dict(r) for r in kawasaki_results.individual_results]
            )
            visualization_file = str(output_path / "hume_analysis_visualizations.html")
            self.logger.info(f"Created visualizations at {visualization_file}")
        except Exception as e:
            self.logger.warning(f"Visualization generation failed: {e}")

        output_paths = {
            'emotion_results': str(emotion_file),
            'kawasaki_results': str(kawasaki_file),
            'report': str(report_file),
            'visualization': visualization_file
        }

        return output_paths

    def _emotion_result_to_dict(self, result: EmotionAnalysisResult) -> Dict[str, Any]:
        """Convert EmotionAnalysisResult to dictionary."""
        return {
            'hume_data_summary': {
                'face_data_points': result.hume_data_summary.face_data_points,
                'prosody_data_points': result.hume_data_summary.prosody_data_points,
                'language_data_points': result.hume_data_summary.language_data_points,
                'total_emotion_points': result.hume_data_summary.total_emotion_points,
                'burst_events': result.hume_data_summary.burst_events
            },
            'emotion_statistics': {
                key: {
                    'count': value.count,
                    'duration_seconds': value.duration_seconds,
                    'top_emotions': value.top_emotions,
                    'dominant_emotion': value.dominant_emotion
                } for key, value in result.emotion_statistics.items()
            },
            'emotion_timeseries': [
                {
                    'timestamp_offset_ms': data.timestamp_offset_ms,
                    'source': data.source,
                    'emotion_data': data.emotion_data
                } for data in result.emotion_timeseries
            ],
            'average_emotions': result.average_emotions
        }

    def _kawasaki_result_to_dict(self, result: KawasakiResults) -> Dict[str, Any]:
        """Convert KawasakiResults to dictionary."""
        return {
            'individual_results': [
                {
                    'p_value': r.p_value,
                    'spirit_probability': r.spirit_probability,
                    'confidence_interval': r.confidence_interval,
                    'stimulus_word': r.stimulus_word,
                    'response_word': r.response_word,
                    'analysis_type': r.analysis_type,
                    'emotion_data_points': r.emotion_data_points
                } for r in result.individual_results
            ],
            'overall_statistics': {
                'total_analyses': result.overall_statistics.total_analyses,
                'avg_spirit_probability': result.overall_statistics.avg_spirit_probability,
                'max_spirit_probability': result.overall_statistics.max_spirit_probability,
                'min_spirit_probability': result.overall_statistics.min_spirit_probability,
                'high_spirit_responses': result.overall_statistics.high_spirit_responses
            },
            'emotion_integration': {
                'total_emotion_points': result.emotion_integration.total_emotion_points,
                'emotion_sources': result.emotion_integration.emotion_sources
            }
        }
