"""
Temporal activity for report generation.
"""

from typing import Dict, Any
from temporalio import activity

from shared.models import EmotionAnalysisResult, KawasakiResults
from .base import BaseActivity


class ReportGenerationActivity(BaseActivity):
    """Activity for generating analysis reports."""

    @activity.defn
    async def generate_report(
        self,
        emotion_results: EmotionAnalysisResult,
        kawasaki_results: KawasakiResults
    ) -> str:
        """
        Generate comprehensive analysis report.
        """
        report = []
        report.append("# Hume AI + Kawasaki Model Analysis Report")
        report.append("")

        # Emotion Analysis Summary
        report.append("## Emotion Analysis Summary")
        summary = emotion_results.hume_data_summary
        report.append(f"- **Face Data Points**: {summary.face_data_points}")
        report.append(f"- **Prosody Data Points**: {summary.prosody_data_points}")
        report.append(f"- **Language Data Points**: {summary.language_data_points}")
        report.append(f"- **Total Emotion Points**: {summary.total_emotion_points}")
        report.append("")

        # Top Emotions
        overall_stats = emotion_results.emotion_statistics.get('overall')
        if overall_stats and overall_stats.top_emotions:
            report.append("## Top Emotions Detected")
            for emotion, score in list(overall_stats.top_emotions.items())[:5]:
                report.append(f"- **{emotion}**: {score:.4f}")
            report.append("")

        # Kawasaki Analysis Results
        report.append("## Kawasaki Model Results")
        stats = kawasaki_results.overall_statistics
        report.append(f"- **Total Analyses**: {stats.total_analyses}")
        report.append(f"- **Average Spirit Probability**: {stats.avg_spirit_probability:.4f}")
        report.append(f"- **Maximum Spirit Probability**: {stats.max_spirit_probability:.4f}")
        report.append(f"- **Minimum Spirit Probability**: {stats.min_spirit_probability:.4f}")
        report.append(f"- **High Spirit Responses** (>0.8): {stats.high_spirit_responses}")
        report.append("")

        # Top Performing Word Pairs
        if kawasaki_results.individual_results:
            report.append("## Top Performing Word Pairs")
            sorted_results = sorted(
                kawasaki_results.individual_results,
                key=lambda x: x.p_value,
                reverse=True
            )[:10]

            for result in sorted_results:
                report.append(".4f")
            report.append("")

        # Emotion Integration Summary
        integration = kawasaki_results.emotion_integration
        report.append("## Emotion Integration Summary")
        report.append(f"- **Emotion Data Points Used**: {integration.total_emotion_points}")
        report.append(f"- **Emotion Sources**: {', '.join(integration.emotion_sources)}")
        report.append("")

        # Conclusion
        report.append("## Conclusion")
        report.append("Successfully integrated Hume AI emotion analysis with Kawasaki Spirit model, ")
        report.append("demonstrating the potential for quantitative measurement of spiritual responses ")
        report.append("through multimodal emotion analysis.")

        return "\n".join(report)
