import asyncio
import logging
import os
from typing import List, Dict, Any, Optional
from pathlib import Path

# Hume AIの実APIを使用するかシミュレーターを使用するかを設定
USE_REAL_API = False

if USE_REAL_API:
    try:
        from hume import AsyncHumeClient
        from hume.expression_measurement.batch import (
            FaceConfig,
            ProsodyConfig,
            LanguageConfig,
            BurstConfig,
            NerConfig,
            Models,
            Job,
            JobState
        )
    except ImportError:
        logging.warning("Hume AI package not available, falling back to simulator")
        USE_REAL_API = False

if not USE_REAL_API:
    from .hume_ai_simulator import HumeAISimulator

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
            # Configure models for emotion analysis
            models = Models(
                face=FaceConfig(),  # Facial expression analysis
                prosody=ProsodyConfig(),  # Vocal emotion analysis
                language=LanguageConfig(),  # Language emotion analysis
                burst=BurstConfig(),  # Emotion bursts
                ner=NerConfig()  # Named entity recognition
            )

            # Start batch job
            job = await self.client.expression_measurement.batch.start_inference_job(
                models=models,
                urls=[],  # We'll upload file directly
                files=[file_path]
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

    async def _wait_for_job_completion(self, job: Job, timeout: int = 300):
        """Wait for Hume AI job to complete."""
        import time

        start_time = time.time()
        while time.time() - start_time < timeout:
            await job.update_status()
            if job.state == JobState.COMPLETED:
                logging.info("Hume AI job completed successfully.")
                return
            elif job.state == JobState.FAILED:
                raise Exception(f"Hume AI job failed: {job.get_details()}")

            logging.info(f"Job status: {job.state}. Waiting...")
            await asyncio.sleep(5)

        raise TimeoutError(f"Hume AI job timed out after {timeout} seconds.")

    def _process_predictions(self, predictions, media_type: str) -> List[Dict[str, Any]]:
        """
        Process Hume AI predictions into time-series format.

        Returns:
            List of dicts with timestamp_offset_ms and emotion_data
        """
        timeseries_data = []

        for prediction in predictions:
            # Process different model predictions
            if hasattr(prediction, 'face') and prediction.face.predictions:
                # Facial emotion data
                for face_pred in prediction.face.predictions:
                    if hasattr(face_pred, 'emotions'):
                        for emotion in face_pred.emotions:
                            timeseries_data.append({
                                "timestamp_offset_ms": getattr(emotion, 'frame_time', 0) * 1000,  # Convert to ms
                                "source": f"hume_api_{media_type}_face",
                                "emotion_data": {
                                    "joy": getattr(emotion, 'joy', 0),
                                    "sadness": getattr(emotion, 'sadness', 0),
                                    "anger": getattr(emotion, 'anger', 0),
                                    "fear": getattr(emotion, 'fear', 0),
                                    "disgust": getattr(emotion, 'disgust', 0),
                                    "surprise": getattr(emotion, 'surprise', 0),
                                    # Add more emotions as available
                                }
                            })

            if hasattr(prediction, 'prosody') and prediction.prosody.predictions:
                # Vocal emotion data
                for prosody_pred in prediction.prosody.predictions:
                    if hasattr(prosody_pred, 'emotions'):
                        for emotion in prosody_pred.emotions:
                            timeseries_data.append({
                                "timestamp_offset_ms": getattr(emotion, 'time', 0) * 1000,  # Convert to ms
                                "source": f"hume_api_{media_type}_prosody",
                                "emotion_data": {
                                    "joy": getattr(emotion, 'joy', 0),
                                    "sadness": getattr(emotion, 'sadness', 0),
                                    "anger": getattr(emotion, 'anger', 0),
                                    "fear": getattr(emotion, 'fear', 0),
                                    "disgust": getattr(emotion, 'disgust', 0),
                                    "surprise": getattr(emotion, 'surprise', 0),
                                }
                            })

            if hasattr(prediction, 'language') and prediction.language.predictions:
                # Language emotion data
                for lang_pred in prediction.language.predictions:
                    if hasattr(lang_pred, 'emotions'):
                        for emotion in lang_pred.emotions:
                            timeseries_data.append({
                                "timestamp_offset_ms": getattr(emotion, 'time', 0) * 1000,  # Convert to ms
                                "source": f"hume_api_{media_type}_language",
                                "emotion_data": {
                                    "joy": getattr(emotion, 'joy', 0),
                                    "sadness": getattr(emotion, 'sadness', 0),
                                    "anger": getattr(emotion, 'anger', 0),
                                    "fear": getattr(emotion, 'fear', 0),
                                    "disgust": getattr(emotion, 'disgust', 0),
                                    "surprise": getattr(emotion, 'surprise', 0),
                                }
                            })

        # Sort by timestamp
        timeseries_data.sort(key=lambda x: x['timestamp_offset_ms'])

        return timeseries_data

    def process_media(self, media_path: str) -> List[Dict[str, Any]]:
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
        return asyncio.run(self.process_media_file(media_path, media_type))
