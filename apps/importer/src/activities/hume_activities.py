from datetime import timedelta
from temporalio import activity
from hume import HumeClient
# from hume import FaceConfig, ProsodyConfig, LanguageConfig
import sys
import os
import asyncio
from typing import Dict, Any, Optional
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

from packages.spirit_in_physics_pipeline.emotion_processor import EmotionProcessor
from packages.spirit_in_physics_pipeline.hume_data_processor import HumeDataProcessor

class HumeActivities:
    def __init__(self, config):
        self.api_key = config['hume_ai']['api_key']
        self.client = HumeClient(self.api_key)
        self.max_poll_attempts = config.get('processing', {}).get('max_poll_attempts', 60)
        self.poll_interval = config.get('processing', {}).get('poll_interval_seconds', 10)

    @activity.defn
    async def submit_job_to_hume(self, file_path: str) -> str:
        """Submits a file to Hume AI for analysis and returns the job ID."""
        activity.logger.info(f"Submitting {file_path} to Hume AI.")
        
        try:
            # Verify file exists
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Media file not found: {file_path}")
            
            # Configure Hume AI analysis
            configs = [
                FaceConfig(),
                ProsodyConfig(),
                LanguageConfig(granularity="word")
            ]

            # Submit job to Hume AI
            job = await self.client.expression_measurement.batch.start_inference_job(
                files=[file_path], 
                configs=configs
            )
            job_id = job.id
            activity.logger.info(f"Successfully submitted job {job_id} to Hume AI.")
            
            return job_id
            
        except Exception as e:
            activity.logger.error(f"Failed to submit job to Hume AI: {e}")
            raise

    @activity.defn
    async def poll_and_fetch_hume_results(self, hume_job_id: str) -> dict:
        """
        Polls a Hume AI job for completion and fetches the results.
        """
        activity.logger.info(f"Polling for Hume job completion: {hume_job_id}")
        
        try:
            # Get job reference
            job = self.client.expression_measurement.batch.get_job(hume_job_id)
            
            # Poll for completion with timeout
            activity.logger.info(f"Waiting for job {hume_job_id} to complete...")
            
            # Use Hume AI's built-in await_complete with timeout
            await asyncio.wait_for(
                job.await_complete(),
                timeout=self.max_poll_attempts * self.poll_interval
            )
            
            activity.logger.info(f"Hume job {hume_job_id} completed. Fetching predictions...")
            
            # Fetch predictions
            predictions = await job.get_predictions()
            
            # Validate predictions structure
            if not predictions:
                raise ValueError(f"No predictions returned for job {hume_job_id}")
            
            activity.logger.info(f"Successfully fetched predictions for job {hume_job_id}.")
            activity.logger.info(f"Prediction types: {list(predictions.keys())}")
            
            return predictions
            
        except asyncio.TimeoutError:
            activity.logger.error(f"Hume job {hume_job_id} timed out after {self.max_poll_attempts * self.poll_interval} seconds")
            raise
        except Exception as e:
            activity.logger.error(f"Failed to poll and fetch results for job {hume_job_id}: {e}")
            raise

    @activity.defn
    async def validate_hume_results(self, predictions: dict) -> bool:
        """Validate Hume AI prediction results structure."""
        activity.logger.info("Validating Hume AI prediction results")
        
        try:
            required_keys = ['face', 'prosody', 'language']
            
            for key in required_keys:
                if key not in predictions:
                    activity.logger.warning(f"Missing prediction type: {key}")
                    continue
                
                if 'predictions' not in predictions[key]:
                    activity.logger.warning(f"Missing predictions array for {key}")
                    continue
                
                predictions_count = len(predictions[key]['predictions'])
                activity.logger.info(f"Found {predictions_count} {key} predictions")
            
            activity.logger.info("Hume AI results validation completed")
            return True
            
        except Exception as e:
            activity.logger.error(f"Failed to validate Hume results: {e}")
            return False

    @activity.defn
    async def get_job_status(self, hume_job_id: str) -> dict:
        """Get current status of a Hume AI job."""
        activity.logger.info(f"Getting status for Hume job: {hume_job_id}")
        
        try:
            job = self.client.expression_measurement.batch.get_job(hume_job_id)
            
            status_info = {
                "job_id": hume_job_id,
                "status": job.status,
                "created_at": job.created_at,
                "updated_at": job.updated_at
            }
            
            activity.logger.info(f"Job {hume_job_id} status: {job.status}")
            return status_info
            
        except Exception as e:
            activity.logger.error(f"Failed to get job status for {hume_job_id}: {e}")
            raise
