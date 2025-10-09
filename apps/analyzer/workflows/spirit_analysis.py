"""
Temporal workflow for the complete spirit analysis pipeline.
"""

import logging
from typing import List, Optional
from temporalio import workflow
from temporalio.common import RetryPolicy

from activities.emotion_analysis import EmotionAnalysisActivity
from activities.kawasaki_analysis import KawasakiAnalysisActivity
from activities.report_generation import ReportGenerationActivity
from activities.result_saving import ResultSavingActivity
from shared.models import EmotionAnalysisResult, KawasakiResults, AnalysisResults

# Configure workflow logger
workflow.logger = logging.getLogger(__name__)


@workflow.defn
class SpiritAnalysisWorkflow:
    """
    Complete analysis workflow for Hume AI data + Kawasaki model.
    Orchestrates the entire analysis pipeline using Temporal activities.
    """

    @workflow.run
    async def run_analysis(
        self,
        stimulus_words: Optional[List[str]] = None,
        output_dir: Optional[str] = None
    ) -> AnalysisResults:
        """
        Run the complete spirit analysis pipeline.

        Args:
            stimulus_words: List of stimulus words for analysis. If None, uses default Jung test words.
            output_dir: Directory to save results. If None, uses config default.

        Returns:
            Complete analysis results including emotion data, Kawasaki analysis, and report.
        """
        workflow.logger.info("Starting Spirit Analysis Workflow")

        # Default stimulus words from Jung test if not provided
        if stimulus_words is None:
            stimulus_words = [
                'head', 'green', 'water', 'death', 'mother', 'father', 'child',
                'love', 'hate', 'joy', 'sadness', 'anger', 'fear', 'peace', 'war'
            ]

        # Step 1: Process Hume AI emotion data
        workflow.logger.info("Step 1: Processing emotion data")
        emotion_activity = workflow.activity_stub(
            EmotionAnalysisActivity,
            retry_policy=RetryPolicy(maximum_attempts=3)
        )
        emotion_results = await emotion_activity.process_emotion_data()

        # Step 2: Run Kawasaki model analysis with emotion integration
        workflow.logger.info("Step 2: Running Kawasaki model analysis")
        kawasaki_activity = workflow.activity_stub(
            KawasakiAnalysisActivity,
            retry_policy=RetryPolicy(maximum_attempts=3)
        )
        kawasaki_results = await kawasaki_activity.run_kawasaki_analysis(
            emotion_results, stimulus_words
        )

        # Step 3: Generate comprehensive report
        workflow.logger.info("Step 3: Generating analysis report")
        report_activity = workflow.activity_stub(
            ReportGenerationActivity,
            retry_policy=RetryPolicy(maximum_attempts=3)
        )
        report_content = await report_activity.generate_report(
            emotion_results, kawasaki_results
        )

        # Step 4: Save results and generate visualizations
        workflow.logger.info("Step 4: Saving results and creating visualizations")
        save_activity = workflow.activity_stub(
            ResultSavingActivity,
            retry_policy=RetryPolicy(maximum_attempts=3)
        )
        output_paths = await save_activity.save_results(
            emotion_results, kawasaki_results, report_content, output_dir
        )

        # Create final results object
        final_results = AnalysisResults(
            emotion_results=emotion_results,
            kawasaki_results=kawasaki_results,
            report_content=report_content,
            output_paths=output_paths
        )

        workflow.logger.info("Spirit Analysis Workflow completed successfully")
        workflow.logger.info(f"Results saved to: {output_paths}")

        return final_results
