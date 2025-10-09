from temporalio import activity
from hume import HumeBatchClient
from hume.models.config import FaceConfig, ProsodyConfig, LanguageConfig
import os

class HumeActivities:
    def __init__(self, config):
        self.api_key = config['api_key']
        self.client = HumeBatchClient(self.api_key)

    @activity.defn
    async def submit_job_to_hume(self, file_path: str) -> str:
        """Submits a file to Hume AI for analysis and returns the job ID."""
        activity.logger.info(f"Submitting {file_path} to Hume AI.")
        
        # Define the models to be used for the analysis, as per the project's needs.
        configs = [
            FaceConfig(),
            ProsodyConfig(),
            LanguageConfig(granularity="word")
        ]

        job = await self.client.submit_job([], configs, files=[file_path])
        job_id = job.id
        activity.logger.info(f"Submitted job {job_id} to Hume AI.")
        return job_id

    @activity.defn
    async def poll_and_fetch_hume_results(self, hume_job_id: str) -> dict:
        """
        Polls a Hume AI job for completion and fetches the results.
        This is a long-running activity that will heartbeat while waiting.
        """
        activity.logger.info(f"Polling for Hume job completion: {hume_job_id}")
        
        job = await self.client.get_job(hume_job_id)
        
        activity.logger.info(f"Waiting for job {hume_job_id} to complete...")
        await job.await_complete()
        
        activity.logger.info(f"Hume job {hume_job_id} completed. Fetching predictions...")
        predictions = await job.get_predictions()
        
        activity.logger.info(f"Successfully fetched predictions for job {hume_job_id}.")
        return predictions
