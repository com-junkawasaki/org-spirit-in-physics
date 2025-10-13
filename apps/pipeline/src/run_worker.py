import asyncio
import os
from temporalio.client import Client
from temporalio.worker import Worker

from .workflows.main_workflow import IngestionWorkflow, UnifiedPipelineWorkflow
from .activities.analysis_activities import AnalysisActivities
from .activities.arangodb import ArangoDBActivities
from .activities.hume_activities import HumeActivities

async def main():
    # Connect to Temporal server using environment variables
    temporal_host = os.getenv('TEMPORAL_HOST', 'temporal')
    temporal_port = os.getenv('TEMPORAL_PORT', '7233')
    temporal_url = f"{temporal_host}:{temporal_port}"

    client = await Client.connect(temporal_url)

    # Create activity instances (they need config for initialization)
    minimal_config = {
        'arangodb': {'url': 'http://arangodb:8529', 'database': 'spirit_in_physics', 'user': 'root', 'password': 'root'},
        'hume_ai': {'api_key': 'dummy_key', 'client_id': 'dummy_client', 'client_secret': 'dummy_secret'}
    }
    arango_instance = ArangoDBActivities(minimal_config)
    hume_instance = HumeActivities(minimal_config)
    analysis_instance = AnalysisActivities()

    worker = Worker(
        client,
        task_queue="pipeline-task-queue",
        workflows=[IngestionWorkflow, UnifiedPipelineWorkflow],
        activities=[
            arango_instance.get_session_for_ingestion,
            arango_instance.store_raw_hume_data,
            arango_instance.parse_and_store_structured_data,
            hume_instance.submit_job_to_hume,
            hume_instance.poll_and_fetch_hume_results,
            analysis_instance.generate_visualizations,
            analysis_instance.run_analysis_pipeline,
        ],
    )
    print("Starting unified pipeline worker...")
    await worker.run()
    print("Pipeline worker finished.")

if __name__ == "__main__":
    asyncio.run(main())