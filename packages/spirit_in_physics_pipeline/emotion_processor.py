import asyncio
import logging
import os
from typing import List, Dict, Any, Optional
from pathlib import Path

# Hume AIの実APIを使用するかシミュレーターを使用するかを設定
USE_REAL_API = True

if USE_REAL_API:
    try:
        from hume import AsyncHumeClient
        # Use the new config objects for models
        from hume.models.config import FaceConfig, ProsodyConfig
        from hume.expression_measurement.batch import InferenceJob, JobStatus
        logging.info("Using real Hume AI API")
    except (ImportError, AttributeError) as e:
        logging.warning(f"Hume AI package import failed ({e}), falling back to simulator")
        USE_REAL_API = False

if not USE_REAL_API:
    from .hume_ai_simulator import HumeAISimulator
    # シミュレーター用のダミークラス
    class InferenceJob:
        pass
    class JobStatus:
        COMPLETED = "COMPLETED"
        FAILED = "FAILED"
    class Job:
        pass

class EmotionProcessor:
    def __init__(self, config):
        self.config = config
        self.use_real_api = USE_REAL_API

        if self.use_real_api:
            self.api_key = config['api_key']
            self.client = AsyncHumeClient(api_key=self.api_key)
            logging.info("EmotionProcessor initialized with Hume AI client.")
        else:
            self.simulator = HumeAISimulator(config)
            logging.info("EmotionProcessor initialized with Hume AI simulator.")

    async def process_media_file(self, file_path: str, media_type: str = "video", participant_id: str = "unknown") -> List[Dict[str, Any]]:
        """
        Processes a video or audio file with Hume AI to get emotion time-series data.

        Args:
            file_path: Path to the media file
            media_type: "video" or "audio"
            participant_id: Participant identifier

        Returns:
            List of emotion time-series data points
        """
        if not self.use_real_api:
            # シミュレーターを使用
            logging.info(f"Using Hume AI simulator for {media_type} file {file_path}")

            if media_type == "video":
                result = self.simulator.analyze_video_emotions(file_path, participant_id)
            else:  # audio
                result = self.simulator.analyze_audio_emotions(file_path, participant_id)

            timeseries_data = result["emotion_timeseries"]
            logging.info(f"Successfully simulated {len(timeseries_data)} emotion data points.")
            return timeseries_data

        # 実APIを使用
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Media file not found: {file_path}")

        logging.info(f"Submitting {media_type} file {file_path} to Hume AI for emotion analysis.")

        try:
            # Configure models for emotion analysis using new config objects
            configs = [ProsodyConfig()] # Prosody is common for both
            if media_type == "video":
                configs.append(FaceConfig())

            # Start batch job
            job = await self.client.expression_measurement.batch.start_inference_job(
                files=[file_path],
                configs=configs
            )

            logging.info(f"Started Hume AI job: {job.id}")

            # Wait for job completion
            await self._wait_for_job_completion(job)

            # Get predictions
            predictions = await job.get_predictions()

            # Process and return emotion time-series data
            timeseries_data = self._process_predictions(predictions, media_type)

            logging.info(f"Successfully processed {len(timeseries_data)} emotion data points.")
            return timeseries_data

        except Exception as e:
            logging.error(f"Failed to process media file with Hume AI: {e}")
            raise

    async def _wait_for_job_completion(self, job: InferenceJob, timeout: int = 600):
        """Wait for Hume AI job to complete."""
        logging.info(f"Awaiting completion for job {job.id}...")
        await job.await_complete(timeout=timeout)
        
        status = await job.get_status()
        logging.info(f"Job {job.id} finished with status: {status}")

        if status == JobStatus.FAILED:
            error = await job.get_error()
            raise Exception(f"Hume AI job failed: {error}")

    def _process_predictions(self, predictions: List[Any], media_type: str) -> List[Dict[str, Any]]:
        """
        Processes Hume AI predictions into a standardized time-series format.
        """
        processed_data = []
        if not predictions:
            logging.warning("No predictions returned from Hume AI.")
            return processed_data

        try:
            # We process one file at a time, so we take the first result
            source_prediction = predictions[0]
            results = source_prediction.get('results')
            if not results:
                logging.warning("No 'results' found in the prediction object.")
                return processed_data

            predictions_by_source = results.get('predictions', [])
            for file_predictions in predictions_by_source:
                # This is a list of predictions for different models (face, prosody)
                for model_pred in file_predictions.get('models', {}).values():
                    # model_pred is a list of predictions for a single model
                    for pred_group in model_pred:
                        for pred in pred_group.get('predictions', []):
                            emotion_scores = {e['name']: e['score'] for e in pred.get('emotions', [])}
                            if emotion_scores:
                                processed_data.append({
                                    "timestamp_offset_ms": int(pred.get('time', 0) * 1000),
                                    "source": f"{media_type}_{file_predictions.get('source', 'unknown')}",
                                    "emotion_data": emotion_scores
                                })
        except (KeyError, IndexError, TypeError) as e:
            logging.error(f"Error parsing Hume AI prediction structure: {e}")
            logging.error(f"Prediction object structure: {predictions}")


        # Sort by timestamp
        processed_data.sort(key=lambda x: x['timestamp_offset_ms'])
        return processed_data

    def process_media(self, media_path: str, participant_id: str = "unknown") -> List[Dict[str, Any]]:
        """
        Synchronous wrapper for async process_media_file.
        Determines media type from file extension.
        """
        # Determine media type from file extension
        _, ext = os.path.splitext(media_path.lower())
        if ext in ['.mp4', '.avi', '.mov', '.webm']:
            media_type = "video"
        elif ext in ['.mp3', '.wav', '.m4a', '.flac']:
            media_type = "audio"
        else:
            media_type = "video"  # default

        # Run async function
        return asyncio.run(self.process_media_file(media_path, media_type, participant_id))
