#!/usr/bin/env python3
"""
Temporal worker for the Spirit Analysis Pipeline.
Runs workflows and activities for the Hume AI + Kawasaki model analysis.
"""

import asyncio
import logging
import yaml
from pathlib import Path

from temporalio.client import Client
from temporalio.worker import Worker

# Import workflows and activities
from workflows.spirit_analysis import SpiritAnalysisWorkflow
from activities.emotion_analysis import EmotionAnalysisActivity
from activities.kawasaki_analysis import KawasakiAnalysisActivity
from activities.report_generation import ReportGenerationActivity
from activities.result_saving import ResultSavingActivity

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)


async def main():
    """Main worker function."""
    # Load configuration
    config_path = Path(__file__).parent / "config.yaml"
    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)

    temporal_config = config['temporal']

    # Create Temporal client
    client = await Client.connect(
        temporal_config['host'],
        namespace=temporal_config['namespace']
    )

    # Create worker
    worker = Worker(
        client,
        task_queue=temporal_config['task_queue'],
        workflows=[SpiritAnalysisWorkflow],
        activities=[
            EmotionAnalysisActivity().process_emotion_data,
            KawasakiAnalysisActivity().run_kawasaki_analysis,
            ReportGenerationActivity().generate_report,
            ResultSavingActivity().save_results,
        ],
    )

    logging.info(f"Starting Temporal worker on task queue: {temporal_config['task_queue']}")
    logging.info("Worker is ready to process workflows...")

    # Run worker
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
