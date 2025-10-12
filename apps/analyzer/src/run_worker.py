import asyncio
import yaml
from temporalio.client import Client
from temporalio.worker import Worker
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from apps.analyzer.src.workflows import VisualizationWorkflow
from apps.analyzer.src.activities import generate_visualizations

def load_config():
    with open("apps/analyzer/config.yaml", 'r') as f:
        return yaml.safe_load(f)

async def main():
    config = load_config()
    
    client = await Client.connect(config['temporal']['server_url'])

    worker = Worker(
        client,
        task_queue=config['temporal']['task_queue_analyzer'],
        workflows=[VisualizationWorkflow],
        activities=[generate_visualizations],
    )
    print("Starting analyzer worker...")
    await worker.run()
    print("Analyzer worker finished.")

if __name__ == "__main__":
    asyncio.run(main())
