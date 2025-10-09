#!/usr/bin/env python3
"""
Temporal client for starting and monitoring Spirit Analysis workflows.
"""

import asyncio
import logging
import uuid
import yaml
from pathlib import Path
from typing import List, Optional

from temporalio.client import Client

from shared.models import AnalysisResults

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)


class SpiritAnalysisClient:
    """Client for managing Spirit Analysis workflows."""

    def __init__(self, config_path: str = "config.yaml"):
        self.config = self._load_config(config_path)
        self.temporal_config = self.config['temporal']
        self.client = None

    def _load_config(self, config_path: str) -> dict:
        """Load configuration from YAML file."""
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            logging.error(f"Could not load config from {config_path}: {e}")
            raise

    async def connect(self):
        """Connect to Temporal server."""
        self.client = await Client.connect(
            self.temporal_config['host'],
            namespace=self.temporal_config['namespace']
        )
        logging.info(f"Connected to Temporal server: {self.temporal_config['host']}")

    async def start_analysis_workflow(
        self,
        stimulus_words: Optional[List[str]] = None,
        output_dir: Optional[str] = None,
        workflow_id: Optional[str] = None
    ) -> str:
        """
        Start a new Spirit Analysis workflow.

        Args:
            stimulus_words: List of stimulus words for analysis
            output_dir: Directory to save results
            workflow_id: Custom workflow ID (auto-generated if None)

        Returns:
            Workflow ID
        """
        if not self.client:
            await self.connect()

        if workflow_id is None:
            workflow_id = f"spirit-analysis-{uuid.uuid4()}"

        # Start workflow
        handle = await self.client.start_workflow(
            "SpiritAnalysisWorkflow",
            args=[stimulus_words, output_dir],
            id=workflow_id,
            task_queue=self.temporal_config['task_queue'],
        )

        logging.info(f"Started workflow: {workflow_id}")
        return workflow_id

    async def get_workflow_result(self, workflow_id: str) -> AnalysisResults:
        """
        Get the result of a completed workflow.

        Args:
            workflow_id: The workflow ID to get results for

        Returns:
            Analysis results
        """
        if not self.client:
            await self.connect()

        handle = self.client.get_workflow_handle(workflow_id)
        result = await handle.result()
        return result

    async def get_workflow_status(self, workflow_id: str) -> dict:
        """
        Get the status of a workflow.

        Args:
            workflow_id: The workflow ID to check

        Returns:
            Workflow status information
        """
        if not self.client:
            await self.connect()

        handle = self.client.get_workflow_handle(workflow_id)

        try:
            # Try to get result (will raise if not complete)
            result = await handle.result()
            return {
                'status': 'COMPLETED',
                'result': result,
                'workflow_id': workflow_id
            }
        except Exception as e:
            # Check if still running
            try:
                description = await handle.describe()
                return {
                    'status': description.status.name,
                    'start_time': description.start_time,
                    'workflow_id': workflow_id,
                    'error': str(e) if 'Workflow' in str(type(e)) else None
                }
            except Exception:
                return {
                    'status': 'UNKNOWN',
                    'workflow_id': workflow_id,
                    'error': 'Could not retrieve workflow status'
                }


async def main():
    """Main client function."""
    import argparse

    parser = argparse.ArgumentParser(description="Spirit Analysis Temporal Client")
    parser.add_argument(
        "--start",
        action="store_true",
        help="Start a new analysis workflow"
    )
    parser.add_argument(
        "--status",
        type=str,
        help="Check status of workflow with given ID"
    )
    parser.add_argument(
        "--result",
        type=str,
        help="Get result of workflow with given ID"
    )
    parser.add_argument(
        "--stimulus-words",
        nargs="*",
        help="Stimulus words for analysis (default: Jung test words)"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        help="Output directory for results"
    )

    args = parser.parse_args()

    client = SpiritAnalysisClient()

    try:
        if args.start:
            # Start new workflow
            stimulus_words = args.stimulus_words if args.stimulus_words else None
            workflow_id = await client.start_analysis_workflow(
                stimulus_words=stimulus_words,
                output_dir=args.output_dir
            )
            print(f"Started workflow: {workflow_id}")

        elif args.status:
            # Check workflow status
            status = await client.get_workflow_status(args.status)
            print(f"Workflow Status: {status['status']}")
            if status.get('error'):
                print(f"Error: {status['error']}")
            if status['status'] == 'COMPLETED':
                print("Workflow completed successfully!")

        elif args.result:
            # Get workflow result
            try:
                result = await client.get_workflow_result(args.result)
                print("Workflow completed successfully!")
                print(f"Emotion data points processed: {result.emotion_results.hume_data_summary.total_emotion_points}")
                print(f"Kawasaki analyses performed: {result.kawasaki_results.overall_statistics.total_analyses}")
                print(f"Average spirit probability: {result.kawasaki_results.overall_statistics.avg_spirit_probability:.4f}")
                print(f"Results saved to: {result.output_paths}")
            except Exception as e:
                print(f"Error getting workflow result: {e}")

        else:
            parser.print_help()

    except Exception as e:
        logging.error(f"Client error: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
