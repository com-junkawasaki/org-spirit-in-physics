from datetime import timedelta
import logging
from hume import HumeClient
from hume.expression_measurement.batch import Face, Prosody, Language
import sys
import os
import asyncio
from typing import Dict, Any, Optional
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

from libs.analysis.emotion_processor import EmotionProcessor
from libs.analysis.hume_data_processor import HumeDataProcessor

logger = logging.getLogger(__name__)

class HumeActivities:
    def __init__(self, config):
        self.api_key = config['hume_ai']['api_key']
        self.client = HumeClient(api_key=self.api_key)
        self.max_poll_attempts = config.get('processing', {}).get('max_poll_attempts', 60)
        self.poll_interval = config.get('processing', {}).get('poll_interval_seconds', 10)

    async def
    async def submit_job_to_hume(self, file_path: str) -> str:
        """Submits a file to Hume AI for analysis and returns the job ID."""
        logger.info(f"Submitting {file_path} to Hume AI.")
        
        try:
            # Verify file exists
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Media file not found: {file_path}")
            
            # Configure Hume AI analysis models
            from hume.expression_measurement.batch import Models
            models = Models(
                face=Face(),
                prosody=Prosody(),
                language=Language()
            )

            # Submit job to Hume AI using the local file method
            job_id = await self.client.expression_measurement.batch.start_inference_job_from_local_file(
                file=[file_path],
                json={"models": models.model_dump()}
            )
            logger.info(f"Successfully submitted job {job_id} to Hume AI.")
            
            return job_id
            
        except Exception as e:
            logger.error(f"Failed to submit job to Hume AI: {e}")
            raise

    async def
    async def poll_and_fetch_hume_results(self, hume_job_id: str) -> dict:
        """
        Polls a Hume AI job for completion and fetches the results.
        """
        logger.info(f"Polling for Hume job completion: {hume_job_id}")
        
        try:
            # Poll for completion with timeout
            logger.info(f"Polling for job {hume_job_id} completion...")

            # Poll for job completion manually since we don't have await_complete
            for attempt in range(self.max_poll_attempts):
                try:
                    job_details = await self.client.expression_measurement.batch.get_job_details(hume_job_id)
                    status = job_details.state

                    if hasattr(status, 'completed') and status.completed:
                        logger.info(f"Hume job {hume_job_id} completed!")
                        break
                    elif hasattr(status, 'failed') and status.failed:
                        raise Exception(f"Hume job {hume_job_id} failed")

                    logger.info(f"Job {hume_job_id} status: {status}, attempt {attempt + 1}/{self.max_poll_attempts}")
                    await asyncio.sleep(self.poll_interval)

                except Exception as poll_error:
                    logger.warning(f"Error polling job {hume_job_id}: {poll_error}")
                    await asyncio.sleep(self.poll_interval)

            else:
                raise TimeoutError(f"Hume job {hume_job_id} did not complete within {self.max_poll_attempts * self.poll_interval} seconds")

            logger.info(f"Hume job {hume_job_id} completed. Fetching predictions...")

            # Fetch predictions
            predictions = await self.client.expression_measurement.batch.get_job_predictions(hume_job_id)
            
            # Validate predictions structure
            if not predictions:
                raise ValueError(f"No predictions returned for job {hume_job_id}")
            
            logger.info(f"Successfully fetched predictions for job {hume_job_id}.")
            logger.info(f"Prediction types: {list(predictions.keys())}")
            
            return predictions
            
        except asyncio.TimeoutError:
            logger.error(f"Hume job {hume_job_id} timed out after {self.max_poll_attempts * self.poll_interval} seconds")
            raise
        except Exception as e:
            logger.error(f"Failed to poll and fetch results for job {hume_job_id}: {e}")
            raise

    async def
    async def validate_hume_results(self, predictions: dict) -> bool:
        """Validate Hume AI prediction results structure."""
        logger.info("Validating Hume AI prediction results")
        
        try:
            required_keys = ['face', 'prosody', 'language']
            
            for key in required_keys:
                if key not in predictions:
                    logger.warning(f"Missing prediction type: {key}")
                    continue
                
                if 'predictions' not in predictions[key]:
                    logger.warning(f"Missing predictions array for {key}")
                    continue
                
                predictions_count = len(predictions[key]['predictions'])
                logger.info(f"Found {predictions_count} {key} predictions")
            
            logger.info("Hume AI results validation completed")
            return True
            
        except Exception as e:
            logger.error(f"Failed to validate Hume results: {e}")
            return False

    async def
    async def get_job_status(self, hume_job_id: str) -> dict:
        """Get current status of a Hume AI job."""
        logger.info(f"Getting status for Hume job: {hume_job_id}")
        
        try:
            job_details = await self.client.expression_measurement.batch.get_job_details(hume_job_id)

            status_info = {
                "job_id": hume_job_id,
                "status": job_details.state,
                "created_at": job_details.created_at if hasattr(job_details, 'created_at') else None,
                "updated_at": job_details.updated_at if hasattr(job_details, 'updated_at') else None
            }
            
            logger.info(f"Job {hume_job_id} status: {job_details.state}")
            return status_info
            
        except Exception as e:
            logger.error(f"Failed to get job status for {hume_job_id}: {e}")
            raise
