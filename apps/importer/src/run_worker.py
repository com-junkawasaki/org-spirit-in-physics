import asyncio
import yaml
from temporalio.client import Client
from temporalio.worker import Worker
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from apps.importer.src.workflows import IngestionWorkflow
from apps.importer.src.activities.arangodb import ArangoDBActivities
from apps.importer.src.activities.hume_activities import HumeActivities

def load_config():
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config.yaml')
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

async def main():
    config = load_config()
    
    client = await Client.connect(config['temporal']['server_url'])

    arangodb_activities = ArangoDBActivities(config)
    hume_activities = HumeActivities(config)
    
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
    print("Starting importer worker...")
    await worker.run()
    print("Importer worker finished.")

if __name__ == "__main__":
    asyncio.run(main())
