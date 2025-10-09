"""
Temporal activity for saving results and generating visualizations.
"""

import sys
from pathlib import Path
from typing import Dict, Any, List
from temporalio import activity

# Add pipeline directory to path
sys.path.append(str(Path(__file__).parent.parent / 'pipeline'))

from shared.models import (
    EmotionAnalysisResult, KawasakiResults, AnalysisResults, OutputPaths
)
from .base import BaseActivity
from pipeline.spirit_visualizer import SpiritVisualizer


class ResultSavingActivity(BaseActivity):
    """Activity for saving analysis results and generating visualizations."""

    def __init__(self):
        super().__init__()
        self.visualizer = SpiritVisualizer()

    @activity.defn
    async def save_results(
        self,
        emotion_results: EmotionAnalysisResult,
        kawasaki_results: KawasakiResults,
        report_content: str,
        output_dir: str = None
    ) -> OutputPaths:
        """
        Save analysis results and generate comprehensive visualizations.
        """
        self.logger.info("Starting result saving and visualization generation...")

        if output_dir is None:
            output_dir = self.config.output.results_dir

        # Ensure output directory exists
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # Convert results to visualization format
        analysis_results = self._convert_to_visualization_format(kawasaki_results)

        # Generate visualizations
        visualization_paths = await self._generate_visualizations(analysis_results, output_dir)

        # Save comprehensive report
        report_path = await self._save_comprehensive_report(
            emotion_results, kawasaki_results, report_content, output_dir
        )

        # Save raw results as JSON
        json_path = await self._save_raw_results(
            emotion_results, kawasaki_results, output_dir
        )

        output_paths = OutputPaths(
            report_path=report_path,
            visualization_paths=visualization_paths,
            raw_data_path=json_path
        )

        self.logger.info(f"Results saved successfully to {output_dir}")
        return output_paths

    def _convert_to_visualization_format(self, kawasaki_results: KawasakiResults) -> List[Dict[str, Any]]:
        """Convert KawasakiResults to format expected by visualizer."""
        visualization_data = []

        for result in kawasaki_results.individual_results:
            viz_result = {
                'p_value': result.p_value,
                'stimulus_word': result.stimulus_word,
                'response_word': result.response_word,
                'analysis_type': result.analysis_type,
                'components': {
                    'word2vec': getattr(result, 'word2vec_component', 0.0),
                    'reaction_time': getattr(result, 'reaction_component', 0.0),
                    'skin_potential': getattr(result, 'sp_component', 0.0),
                    'emotion': getattr(result, 'emotion_component', 0.0)
                },
                'raw_inputs': {
                    'stimulus_word': result.stimulus_word,
                    'response_word': result.response_word
                }
            }
            visualization_data.append(viz_result)

        return visualization_data

    async def _generate_visualizations(self, analysis_results: List[Dict[str, Any]], output_dir: str) -> List[str]:
        """Generate all visualizations."""
        self.logger.info("Generating visualizations...")

        visualization_paths = []

        try:
            # Generate spirit vector plot
            spirit_plot_path = f"{output_dir}/spirit_vectors_3d.html"
            self.visualizer.create_spirit_vector_plot(analysis_results, spirit_plot_path)
            visualization_paths.append(spirit_plot_path)

            # Generate component analysis
            component_plot_path = f"{output_dir}/component_analysis.html"
            self.visualizer.create_component_analysis_plot(analysis_results, component_plot_path)
            visualization_paths.append(component_plot_path)

            # Generate heatmap
            heatmap_path = f"{output_dir}/spirit_probability_heatmap.html"
            self.visualizer.create_probability_heatmap(analysis_results, heatmap_path)
            visualization_paths.append(heatmap_path)

            # Generate time series plots if physiological data available
            timeseries_path = f"{output_dir}/physiological_timeseries.html"
            self.visualizer.create_timeseries_plot(analysis_results, timeseries_path)
            visualization_paths.append(timeseries_path)

            self.logger.info(f"Generated {len(visualization_paths)} visualizations")

        except Exception as e:
            self.logger.error(f"Error generating visualizations: {e}")

        return visualization_paths

    async def _save_comprehensive_report(
        self,
        emotion_results: EmotionAnalysisResult,
        kawasaki_results: KawasakiResults,
        report_content: str,
        output_dir: str
    ) -> str:
        """Save comprehensive analysis report."""
        report_path = f"{output_dir}/comprehensive_analysis_report.md"

        try:
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write("# Spirit in Physics - Comprehensive Analysis Report\n\n")
                f.write(f"Generated: {self._get_timestamp()}\n\n")

                # Executive Summary
                f.write("## Executive Summary\n\n")
                f.write(f"- Total analyses: {kawasaki_results.overall_statistics.total_analyses}\n")
                f.write(f"- Average Spirit probability: {kawasaki_results.overall_statistics.avg_spirit_probability:.4f}\n")
                f.write(f"- High Spirit responses (>0.8): {kawasaki_results.overall_statistics.high_spirit_responses}\n")
                f.write(f"- Emotion data points: {emotion_results.hume_data_summary.total_emotion_points}\n\n")

                # Emotion Analysis Section
                f.write("## Emotion Analysis Results\n\n")
                f.write(f"- Face data points: {emotion_results.hume_data_summary.face_data_points}\n")
                f.write(f"- Prosody data points: {emotion_results.hume_data_summary.prosody_data_points}\n")
                f.write(f"- Language data points: {emotion_results.hume_data_summary.language_data_points}\n")
                f.write(f"- Burst events: {emotion_results.hume_data_summary.burst_events}\n\n")

                # Kawasaki Model Results
                f.write("## Kawasaki Model Analysis\n\n")
                f.write("### Individual Results\n\n")
                f.write("| Stimulus | Response | Spirit Probability | Analysis Type |\n")
                f.write("|----------|----------|-------------------|---------------|\n")

                for result in kawasaki_results.individual_results[:20]:  # Top 20 results
                    f.write(f"| {result.stimulus_word} | {result.response_word} | {result.p_value:.4f} | {result.analysis_type} |\n")

                f.write("\n### Statistical Summary\n\n")
                stats = kawasaki_results.overall_statistics
                f.write(f"- Total analyses: {stats.total_analyses}\n")
                f.write(f"- Average Spirit probability: {stats.avg_spirit_probability:.4f}\n")
                f.write(f"- Maximum Spirit probability: {stats.max_spirit_probability:.4f}\n")
                f.write(f"- Minimum Spirit probability: {stats.min_spirit_probability:.4f}\n")
                f.write(f"- High Spirit responses: {stats.high_spirit_responses}\n\n")

                # Detailed Report Content
                f.write("## Detailed Analysis\n\n")
                f.write(report_content)
                f.write("\n\n---\n*Report generated by Spirit in Physics Temporal Analysis Pipeline*")

            self.logger.info(f"Comprehensive report saved to {report_path}")

        except Exception as e:
            self.logger.error(f"Error saving comprehensive report: {e}")
            report_path = ""

        return report_path

    async def _save_raw_results(
        self,
        emotion_results: EmotionAnalysisResult,
        kawasaki_results: KawasakiResults,
        output_dir: str
    ) -> str:
        """Save raw results as JSON."""
        json_path = f"{output_dir}/analysis_results.json"

        try:
            import json
            results_data = {
                'emotion_analysis': {
                    'hume_data_summary': {
                        'face_data_points': emotion_results.hume_data_summary.face_data_points,
                        'prosody_data_points': emotion_results.hume_data_summary.prosody_data_points,
                        'language_data_points': emotion_results.hume_data_summary.language_data_points,
                        'total_emotion_points': emotion_results.hume_data_summary.total_emotion_points,
                        'burst_events': emotion_results.hume_data_summary.burst_events
                    },
                    'emotion_statistics': emotion_results.emotion_statistics,
                    'average_emotions': emotion_results.average_emotions
                },
                'kawasaki_analysis': {
                    'overall_statistics': {
                        'total_analyses': kawasaki_results.overall_statistics.total_analyses,
                        'avg_spirit_probability': kawasaki_results.overall_statistics.avg_spirit_probability,
                        'max_spirit_probability': kawasaki_results.overall_statistics.max_spirit_probability,
                        'min_spirit_probability': kawasaki_results.overall_statistics.min_spirit_probability,
                        'high_spirit_responses': kawasaki_results.overall_statistics.high_spirit_responses
                    },
                    'individual_results': [
                        {
                            'p_value': result.p_value,
                            'stimulus_word': result.stimulus_word,
                            'response_word': result.response_word,
                            'analysis_type': result.analysis_type,
                            'emotion_data_points': result.emotion_data_points
                        } for result in kawasaki_results.individual_results
                    ]
                },
                'metadata': {
                    'generated_at': self._get_timestamp(),
                    'pipeline_version': 'temporal-v1.0'
                }
            }

            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(results_data, f, indent=2, ensure_ascii=False)

            self.logger.info(f"Raw results saved to {json_path}")

        except Exception as e:
            self.logger.error(f"Error saving raw results: {e}")
            json_path = ""

        return json_path

    def _get_timestamp(self) -> str:
        """Get current timestamp."""
        from datetime import datetime
        return datetime.now().isoformat()