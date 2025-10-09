import asyncio
import argparse
import yaml
from temporalio.client import Client
from .workflows import IngestionWorkflow

def load_config():
    # Adjust the path to be relative to this script's location
    import os
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config.yaml')
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

async def main():
    parser = argparse.ArgumentParser(description="Start an Ingestion Workflow for a session.")
    parser.add_argument(
        "--session-id",
        dest="session_id",
        required=True,
        help="The participant_experiment_session_id to process."
    )
    args = parser.parse_args()
    
    config = load_config()

    client = await Client.connect(config['temporal']['server_url'])

    print(f"Starting IngestionWorkflow for session: {args.session_id}")
    
    # Start the workflow
    result = await client.execute_workflow(
        IngestionWorkflow.run,
        args.session_id,
        id=f"ingestion-workflow-{args.session_id}",
        task_queue=config['temporal']['task_queue'],
    )
    
    print(f"Workflow finished with result: {result}")

if __name__ == "__main__":
    asyncio.run(main())
