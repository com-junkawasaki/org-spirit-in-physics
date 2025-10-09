#!/usr/bin/env python3
"""
Main runner script for the Temporal-based Spirit Analysis Pipeline.
Provides a simple interface similar to the original analyzer.
"""

import asyncio
import logging
import time
from typing import List, Optional

from client import SpiritAnalysisClient

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)


async def run_analysis_sync(
    stimulus_words: Optional[List[str]] = None,
    output_dir: Optional[str] = None,
    workflow_id: Optional[str] = None
):
    """
    Run analysis synchronously (wait for completion).

    Args:
        stimulus_words: List of stimulus words for analysis
        output_dir: Output directory for results
        workflow_id: Custom workflow ID
    """
    client = SpiritAnalysisClient()

    try:
        # Start workflow
        workflow_id = await client.start_analysis_workflow(
            stimulus_words=stimulus_words,
            output_dir=output_dir,
            workflow_id=workflow_id
        )

        print(f"Started analysis workflow: {workflow_id}")
        print("Waiting for completion...")

        # Poll for completion
        while True:
            status = await client.get_workflow_status(workflow_id)

            if status['status'] == 'COMPLETED':
                # Get results
                result = await client.get_workflow_result(workflow_id)

                # Print summary
                print("\n" + "="*60)
                print("ANALYSIS COMPLETE!")
                print("="*60)
                print(f"Workflow ID: {workflow_id}")
                print(f"Emotion data points processed: {result.emotion_results.hume_data_summary.total_emotion_points}")
                print(f"Kawasaki analyses performed: {result.kawasaki_results.overall_statistics.total_analyses}")
                print(f"Average spirit probability: {result.kawasaki_results.overall_statistics.avg_spirit_probability:.4f}")
                print(f"Results saved to: {result.output_paths.get('report', 'results/')}")
                print("="*60)
                break

            elif status['status'] in ['FAILED', 'TIMEOUT', 'CANCELED', 'TERMINATED']:
                print(f"Workflow failed with status: {status['status']}")
                if status.get('error'):
                    print(f"Error: {status['error']}")
                break

            else:
                print(f"Workflow status: {status['status']} - waiting...")
                await asyncio.sleep(5)  # Wait 5 seconds before checking again

    except Exception as e:
        logging.error(f"Analysis failed: {e}")
        raise


def main():
    """Main function with command line interface."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Run Spirit Analysis Pipeline (Temporal Version)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run with default Jung test words
  python run_analysis.py

  # Run with custom stimulus words
  python run_analysis.py --stimulus-words head green water death mother

  # Run with custom output directory
  python run_analysis.py --output-dir ./my-analysis-results

  # Run async (don't wait for completion)
  python run_analysis.py --async-mode

  # Specify custom workflow ID
  python run_analysis.py --workflow-id my-custom-analysis-001
        """
    )

    parser.add_argument(
        "--stimulus-words",
        nargs="*",
        help="Stimulus words for analysis (default: Jung test words)"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        help="Output directory for results (default: config setting)"
    )
    parser.add_argument(
        "--workflow-id",
        type=str,
        help="Custom workflow ID (auto-generated if not specified)"
    )
    parser.add_argument(
        "--async-mode",
        action="store_true",
        help="Run asynchronously (don't wait for completion)"
    )

    args = parser.parse_args()

    # Set default stimulus words if none provided
    stimulus_words = args.stimulus_words
    if stimulus_words is None:
        stimulus_words = [
            'head', 'green', 'water', 'death', 'mother', 'father', 'child',
            'love', 'hate', 'joy', 'sadness', 'anger', 'fear', 'peace', 'war'
        ]

    if args.async_mode:
        # Run asynchronously
        async def run_async():
            client = SpiritAnalysisClient()
            workflow_id = await client.start_analysis_workflow(
                stimulus_words=stimulus_words,
                output_dir=args.output_dir,
                workflow_id=args.workflow_id
            )
            print(f"Started analysis workflow: {workflow_id}")
            print("Use 'python client.py --status <workflow-id>' to check progress")

        asyncio.run(run_async())
    else:
        # Run synchronously
        asyncio.run(run_analysis_sync(
            stimulus_words=stimulus_words,
            output_dir=args.output_dir,
            workflow_id=args.workflow_id
        ))


if __name__ == "__main__":
    main()
