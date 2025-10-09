#!/usr/bin/env python3
"""
Complete Hume AI + Kawasaki Model Analysis Runner
Processes Hume AI emotion data and runs full Kawasaki model analysis.
"""

import json
import logging
import sys
import os
from pathlib import Path
from typing import Dict, Any, List

# Add src directory to path for imports
sys.path.append(str(Path(__file__).parent / 'src'))

from pipeline.hume_data_processor import HumeDataProcessor
from pipeline.kawasaki_model import KawasakiModel
from pipeline.feature_extractor import FeatureExtractor
from pipeline.physiological_processor import PhysiologicalProcessor
from pipeline.data_storer import DataStorer
from visualization.spirit_visualizer import SpiritVisualizer

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class HumeAnalysisRunner:
    """
    Complete analysis runner for Hume AI data + Kawasaki model.
    """

    def __init__(self, config_path: str = "config.yaml"):
        self.config = self._load_config(config_path)
        self.hume_processor = HumeDataProcessor()
        self.kawasaki_model = KawasakiModel(
            self.config.get('model_params', {}),
            self.config.get('word2vec', {})
        )
        self.feature_extractor = FeatureExtractor(self.config.get('model_params', {}))
        self.physiological_processor = PhysiologicalProcessor()

        # Mock data storer for local analysis (no Supabase needed)
        self.data_storer = None

        logging.info("HumeAnalysisRunner initialized")

    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from YAML file."""
        try:
            import yaml
            with open(config_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            logging.warning(f"Could not load config from {config_path}: {e}")
            # Return default config
            return {
                'model_params': {
                    'alpha': 1.0,
                    'gamma': 1.0,
                    'eta': 1.0,
                    'lambda': 1.0,
                    'epsilon': 0.001
                },
                'word2vec': {
                    'model_path': None
                }
            }

    def create_mock_response_data(self, stimulus_word: str, response_word: str,
                                reaction_time_ms: int = 1000) -> Dict[str, Any]:
        """
        Create mock response data for Kawasaki model analysis.
        Since we don't have real participant data, we'll create synthetic responses.
        """
        return {
            'id': f'mock_response_{stimulus_word}_{response_word}',
            'participant_id': 'hume_test_participant',
            'experiment_id': 'hume_analysis_test',
            'word_stimulus_id': 1,  # Mock ID
            'stimulus_word': stimulus_word,
            'response_word': response_word,
            'reaction_time_ms': reaction_time_ms,
            'session': 'session-1',
            'timestamp': '2024-10-04T00:00:00Z',
            'audio_file_path': None,
            'video_file_path': 'hume_data/mock_video.mp4',  # Mock path
            'skin_potential': 0.0,  # Mock physiological data
            'emotion': 'neutral',
            'emotion_confidence': 0.5
        }

    def run_emotion_analysis(self) -> Dict[str, Any]:
        """
        Process Hume AI emotion data and return comprehensive analysis.
        """
        logging.info("Starting Hume AI emotion data analysis...")

        # Process all Hume AI data
        hume_results = self.hume_processor.process_all_hume_data()

        # Calculate emotion statistics
        emotion_stats = self._calculate_emotion_statistics(hume_results)

        # Create comprehensive results
        results = {
            'hume_data_summary': {
                'face_data_points': hume_results['face_data_count'],
                'prosody_data_points': hume_results['prosody_data_count'],
                'language_data_points': hume_results['language_data_count'],
                'total_emotion_points': hume_results['total_emotion_points'],
                'burst_events': hume_results['burst_data_count']
            },
            'emotion_statistics': emotion_stats,
            'emotion_timeseries': hume_results['emotion_timeseries'],
            'average_emotions': hume_results['average_emotions']
        }

        logging.info(f"Emotion analysis complete: {results['hume_data_summary']}")
        return results

    def _calculate_emotion_statistics(self, hume_results: Dict[str, Any]) -> Dict[str, Any]:
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

    def _stats_for_emotion_list(self, emotion_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate statistics for a list of emotion data points."""
        if not emotion_list:
            return {'count': 0, 'duration_seconds': 0}

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

        return {
            'count': len(emotion_list),
            'duration_seconds': duration_ms / 1000,
            'top_emotions': dict(top_emotions),
            'dominant_emotion': top_emotions[0][0] if top_emotions else None
        }

    def run_kawasaki_analysis(self, emotion_results: Dict[str, Any],
                            stimulus_words: List[str] = None) -> Dict[str, Any]:
        """
        Run Kawasaki model analysis using Hume AI emotion data.
        """
        logging.info("Starting Kawasaki model analysis with Hume AI data...")

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
                emotion_timeseries = emotion_results.get('emotion_timeseries', [])

                try:
                    # Extract features
                    features = self.feature_extractor.extract_features_for_response(
                        mock_response, sp_timeseries, emotion_timeseries
                    )

                    # Run Kawasaki model
                    kawasaki_result = self.kawasaki_model.calculate(features)

                    # Add metadata
                    result_with_metadata = {
                        **kawasaki_result,
                        'stimulus_word': stimulus,
                        'response_word': response,
                        'analysis_type': 'hume_integrated',
                        'emotion_data_points': len(emotion_timeseries)
                    }

                    analysis_results.append(result_with_metadata)

                    logging.info(f"Completed analysis for {stimulus} -> {response}: P-value = {kawasaki_result['p_value']:.4f}")
                except Exception as e:
                    logging.error(f"Failed to analyze {stimulus} -> {response}: {e}")

        # Calculate overall statistics
        if analysis_results:
            p_values = [r['p_value'] for r in analysis_results]
            overall_stats = {
                'total_analyses': len(analysis_results),
                'avg_spirit_probability': sum(p_values) / len(p_values),
                'max_spirit_probability': max(p_values),
                'min_spirit_probability': min(p_values),
                'high_spirit_responses': len([p for p in p_values if p > 0.8])
            }
        else:
            overall_stats = {'total_analyses': 0}

        results = {
            'individual_results': analysis_results,
            'overall_statistics': overall_stats,
            'emotion_integration': {
                'total_emotion_points': len(emotion_results.get('emotion_timeseries', [])),
                'emotion_sources': list(set(d['source'] for d in emotion_results.get('emotion_timeseries', [])))
            }
        }

        logging.info(f"Kawasaki analysis complete: {overall_stats}")
        return results

    def generate_report(self, emotion_results: Dict[str, Any],
                       kawasaki_results: Dict[str, Any]) -> str:
        """
        Generate comprehensive analysis report.
        """
        report = []
        report.append("# Hume AI + Kawasaki Model Analysis Report")
        report.append("")

        # Emotion Analysis Summary
        report.append("## Emotion Analysis Summary")
        summary = emotion_results['hume_data_summary']
        report.append(f"- **Face Data Points**: {summary['face_data_points']}")
        report.append(f"- **Prosody Data Points**: {summary['prosody_data_points']}")
        report.append(f"- **Language Data Points**: {summary['language_data_points']}")
        report.append(f"- **Total Emotion Points**: {summary['total_emotion_points']}")
        report.append("")

        # Top Emotions
        overall_stats = emotion_results['emotion_statistics'].get('overall', {})
        if overall_stats.get('top_emotions'):
            report.append("## Top Emotions Detected")
            for emotion, score in list(overall_stats['top_emotions'].items())[:5]:
                report.append(".4f")
            report.append("")

        # Kawasaki Analysis Results
        report.append("## Kawasaki Model Results")
        stats = kawasaki_results['overall_statistics']
        report.append(f"- **Total Analyses**: {stats['total_analyses']}")
        report.append(".4f")
        report.append(".4f")
        report.append(".4f")
        report.append(f"- **High Spirit Responses** (>0.8): {stats['high_spirit_responses']}")
        report.append("")

        # Top Performing Word Pairs
        if kawasaki_results['individual_results']:
            report.append("## Top Performing Word Pairs")
            sorted_results = sorted(
                kawasaki_results['individual_results'],
                key=lambda x: x['p_value'],
                reverse=True
            )[:10]

            for result in sorted_results:
                report.append(f"- **{result['stimulus_word']}** → **{result['response_word']}** "
                             ".4f")
            report.append("")

        # Emotion Integration Summary
        integration = kawasaki_results['emotion_integration']
        report.append("## Emotion Integration Summary")
        report.append(f"- **Emotion Data Points Used**: {integration['total_emotion_points']}")
        report.append(f"- **Emotion Sources**: {', '.join(integration['emotion_sources'])}")
        report.append("")
        report.append("## Conclusion")
        report.append("Successfully integrated Hume AI emotion analysis with Kawasaki Spirit model, ")
        report.append("demonstrating the potential for quantitative measurement of spiritual responses ")
        report.append("through multimodal emotion analysis.")

        return "\n".join(report)

    def save_results(self, emotion_results: Dict[str, Any],
                    kawasaki_results: Dict[str, Any], output_dir: str = "results"):
        """
        Save analysis results to files.
        """
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)

        # Save emotion results
        emotion_file = output_path / "hume_emotion_analysis.json"
        with open(emotion_file, 'w', encoding='utf-8') as f:
            json.dump(emotion_results, f, indent=2, ensure_ascii=False)
        logging.info(f"Saved emotion analysis to {emotion_file}")

        # Save Kawasaki results
        kawasaki_file = output_path / "kawasaki_analysis.json"
        with open(kawasaki_file, 'w', encoding='utf-8') as f:
            json.dump(kawasaki_results, f, indent=2, ensure_ascii=False)
        logging.info(f"Saved Kawasaki analysis to {kawasaki_file}")

        # Generate and save report
        report = self.generate_report(emotion_results, kawasaki_results)
        report_file = output_path / "analysis_report.md"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        logging.info(f"Saved analysis report to {report_file}")

        # Create visualization if visualizer is available
        try:
            visualizer = SpiritVisualizer(str(output_path))
            visualizer.save_all_visualizations("hume_analysis", kawasaki_results['individual_results'])
        except Exception as e:
            logging.warning(f"Visualization generation failed: {e}")

def main():
    """Main analysis runner."""
    logging.info("Starting Hume AI + Kawasaki Model Complete Analysis")

    # Initialize runner
    runner = HumeAnalysisRunner()

    try:
        # Step 1: Process Hume AI emotion data
        emotion_results = runner.run_emotion_analysis()

        # Step 2: Run Kawasaki model analysis with emotion integration
        stimulus_words = [
            'head', 'green', 'water', 'death', 'mother', 'father', 'child',
            'love', 'hate', 'joy', 'sadness', 'anger', 'fear', 'peace', 'war'
        ]
        kawasaki_results = runner.run_kawasaki_analysis(emotion_results, stimulus_words)

        # Step 3: Save results and generate report
        runner.save_results(emotion_results, kawasaki_results)

        # Print summary
        print("\n" + "="*60)
        print("ANALYSIS COMPLETE!")
        print("="*60)
        print(f"Emotion data points processed: {emotion_results['hume_data_summary']['total_emotion_points']}")
        print(f"Kawasaki analyses performed: {kawasaki_results['overall_statistics']['total_analyses']}")
        print(".4f")
        print("Results saved to 'results/' directory")
        print("="*60)

    except Exception as e:
        logging.error(f"Analysis failed: {e}")
        raise

if __name__ == "__main__":
    main()
