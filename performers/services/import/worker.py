import asyncio
import logging
import os
from temporalio.client import Client
from temporalio.worker import Worker

from app.database import init_db_pool, close_db_pool
from app.workflows import ImportParticipantsWorkflow, ImportSessionsWorkflow, StimulusAudioGenerationWorkflow
from app.activities import ImportActivities

logging.basicConfig(level=logging.INFO)

async def main():
    # Initialize DB pool for activities
    database_url = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@postgres:5432/spirit_in_physics'
    )
    await init_db_pool(database_url)
    
    # Connect to Temporal
    temporal_address = os.getenv("TEMPORAL_ADDRESS", "infra-temporal:7233")
    try:
        client = await Client.connect(temporal_address)
    except Exception as e:
        logging.error(f"Failed to connect to Temporal: {e}")
        return
    
    activities = ImportActivities()
    
    worker = Worker(
        client,
        task_queue="import-task-queue",
        workflows=[ImportParticipantsWorkflow, ImportSessionsWorkflow, StimulusAudioGenerationWorkflow],
        activities=[
            activities.list_participant_directories, 
            activities.process_participant,
            activities.process_session,
            activities.generate_timeline,
            activities.process_physiological_data,
            activities.generate_stimulus_audio
        ],
    )
    
    logging.info(f"Starting Python Temporal worker on {temporal_address}...")
    try:
        await worker.run()
    finally:
        await close_db_pool()

if __name__ == "__main__":
    asyncio.run(main())
