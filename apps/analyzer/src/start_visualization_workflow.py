import asyncio
import argparse
import yaml
from temporalio.client import Client
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from apps.analyzer.src.workflows import VisualizationWorkflow

def load_config():
    with open("apps/analyzer/config.yaml", 'r') as f:
        return yaml.safe_load(f)

async def main():
    parser = argparse.ArgumentParser(description="Start a Visualization Workflow for an analysis run.")
    parser.add_argument(
        "--run-id",
        dest="run_id",
        required=True,
        help="The analysis_run_id to generate visualizations for."
    )
    args = parser.parse_args()
    
    config = load_config()

    client = await Client.connect(config['temporal']['server_url'])

    print(f"Starting VisualizationWorkflow for run: {args.run_id}")
    
    result = await client.execute_workflow(
        VisualizationWorkflow.run,
        (args.run_id, config),
        id=f"visualization-workflow-{args.run_id}",
        task_queue=config['temporal']['task_queue_analyzer'],
    )
    
    print(f"Workflow finished with result: {result}")

if __name__ == "__main__":
    asyncio.run(main())
