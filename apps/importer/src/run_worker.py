import asyncio
import yaml
from temporalio.client import Client
from temporalio.worker import Worker

# Import your workflow and activities
from .workflows import IngestionWorkflow
from .activities.arangodb_activities import ArangoDBActivities
from .activities.hume_activities import HumeActivities
from activities.hume_activities import process_media_file, store_hume_results
from workflows import HumeAnalysisWorkflow

def load_config():
    with open("config.yaml", 'r') as f:
        return yaml.safe_load(f)

async def main():
    config = load_config()
    
    # Create client connected to server
    client = await Client.connect(config['temporal']['server_url'])

    # Instantiate activities with their dependencies
    arangodb_activities = ArangoDBActivities(config['arangodb'])
    hume_activities = HumeActivities(config['hume'])
    
    # Run the worker
    worker = Worker(
        client,
        task_queue=config['temporal']['task_queue'],
        workflows=[IngestionWorkflow],
        activities=[
            arangodb_activities.get_session_for_ingestion,
            arangodb_activities.download_media_file,
            arangodb_activities.store_raw_hume_data,
            arangodb_activities.parse_and_store_structured_data,
            arangodb_activities.update_session_status,
            arangodb_activities.cleanup_temp_files,
            hume_activities.submit_job_to_hume,
            hume_activities.poll_and_fetch_hume_results
        ],
    )
    print("Starting worker...")
    await worker.run()
    print("Worker finished.")

if __name__ == "__main__":
    asyncio.run(main())
