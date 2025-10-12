from datetime import timedelta
from temporalio import activity
from hume import HumeClient
from hume.models.config import FaceConfig, ProsodyConfig, LanguageConfig
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

from packages.spirit_in_physics_pipeline.emotion_processor import EmotionProcessor
from packages.spirit_in_physics_pipeline.hume_data_processor import HumeDataProcessor

class HumeActivities:
    def __init__(self, config):
        self.api_key = config['hume_ai']['api_key']
        self.client = HumeClient(self.api_key)

    @activity.defn
    async def submit_job_to_hume(self, file_path: str) -> str:
        """Submits a file to Hume AI for analysis and returns the job ID."""
        activity.logger.info(f"Submitting {file_path} to Hume AI.")
        
        configs = [
            FaceConfig(),
            ProsodyConfig(),
            LanguageConfig(granularity="word")
        ]

        job = await self.client.expression_measurement.batch.start_inference_job(files=[file_path], configs=configs)
        job_id = job.id
        activity.logger.info(f"Submitted job {job_id} to Hume AI.")
        return job_id

    @activity.defn
    async def poll_and_fetch_hume_results(self, hume_job_id: str) -> dict:
        """
        Polls a Hume AI job for completion and fetches the results.
        """
        activity.logger.info(f"Polling for Hume job completion: {hume_job_id}")
        
        job = self.client.expression_measurement.batch.get_job(hume_job_id)
        
        activity.logger.info(f"Waiting for job {hume_job_id} to complete...")
        await job.await_complete()
        
        activity.logger.info(f"Hume job {hume_job_id} completed. Fetching predictions...")
        predictions = await job.get_predictions()
        
        activity.logger.info(f"Successfully fetched predictions for job {hume_job_id}.")
        return predictions
