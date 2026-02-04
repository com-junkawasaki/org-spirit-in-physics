import asyncio
import logging
import os

from dapr.ext.workflow import WorkflowRuntime

from app.database import init_db_pool, close_db_pool
from app.dapr_workflows.import_workflows import (
    import_participants_workflow,
    import_sessions_workflow,
    stimulus_audio_generation_workflow,
)
from app.dapr_activities import import_activities

logging.basicConfig(level=logging.INFO)


async def main():
    # Initialize DB pool for activities
    database_url = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@postgres:5432/spirit_in_physics'
    )
    await init_db_pool(database_url)

    # Create Dapr workflow runtime
    runtime = WorkflowRuntime()

    # Register workflows
    runtime.register_workflow(import_participants_workflow)
    runtime.register_workflow(import_sessions_workflow)
    runtime.register_workflow(stimulus_audio_generation_workflow)

    # Register activities
    runtime.register_activity(import_activities.list_participant_directories)
    runtime.register_activity(import_activities.process_participant)
    runtime.register_activity(import_activities.process_session)
    runtime.register_activity(import_activities.generate_timeline)
    runtime.register_activity(import_activities.process_physiological_data)
    runtime.register_activity(import_activities.generate_stimulus_audio)

    logging.info("Starting Dapr workflow runtime...")
    try:
        runtime.start()
        # Run forever
        await asyncio.Event().wait()
    finally:
        await close_db_pool()


if __name__ == "__main__":
    asyncio.run(main())
