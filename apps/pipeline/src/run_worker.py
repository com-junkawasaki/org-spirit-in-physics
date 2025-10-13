import asyncio
import yaml
import os
from temporalio.client import Client
from temporalio.worker import Worker

from .workflows import VisualizationWorkflow, AnalysisWorkflow, IntegratedAnalysisWorkflow
from .activities import generate_visualizations, run_analysis_pipeline

def load_config():
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config.yaml')
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

async def main():
    config = load_config()
    
    client = await Client.connect(config['temporal']['server_url'])

    worker = Worker(
        client,
        task_queue=config['temporal']['task_queue_analyzer'],
        workflows=[VisualizationWorkflow, AnalysisWorkflow, IntegratedAnalysisWorkflow],
        activities=[generate_visualizations, run_analysis_pipeline],
    )
    print("Starting analyzer worker...")
    await worker.run()
    print("Analyzer worker finished.")

if __name__ == "__main__":
    asyncio.run(main())