import asyncio
import argparse
import yaml
import os
from temporalio.client import Client

from .workflows import AnalysisWorkflow

def load_config():
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config.yaml')
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

async def main():
    parser = argparse.ArgumentParser(description="Start an Analysis Workflow.")
    parser.add_argument(
        "--model-version",
        dest="model_version",
        required=True,
        help="The model version for this analysis run."
    )
    parser.add_argument(
        "--notes",
        dest="notes",
        default="",
        help="Notes for this analysis run."
    )
    args = parser.parse_args()
    
    config = load_config()

    client = await Client.connect(config['temporal']['server_url'])

    print(f"Starting AnalysisWorkflow with model version: {args.model_version}")
    
    result = await client.execute_workflow(
        AnalysisWorkflow.run,
        (args.model_version, args.notes, config),
        id=f"analysis-workflow-{args.model_version}-{asyncio.get_event_loop().time()}",
        task_queue=config['temporal']['task_queue_analyzer'],
    )
    
    print(f"Workflow finished with result: {result}")

if __name__ == "__main__":
    asyncio.run(main())
