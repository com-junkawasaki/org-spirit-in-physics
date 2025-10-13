import asyncio
import logging
import signal
import sys
from typing import Dict, Any, Optional
import os

from job_manager import JobManager, JobType, JobStatus
from emotion_processor import EmotionProcessor
from feature_extractor import FeatureExtractor
from kawasaki_model import KawasakiModel
from data_loader import DataLoader
from data_storer import DataStorer

class JobWorker:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.job_manager = JobManager(config['arangodb'])
        self.data_loader = DataLoader(config['arangodb'])
        self.emotion_processor = EmotionProcessor(config['hume_ai'])
        self.feature_extractor = FeatureExtractor(config['model_params'])
        self.kawasaki_model = KawasakiModel(config['model_params'], config['word2vec'])
        self.data_storer = DataStorer(config['arangodb'])
        
        self.running = True
        self.max_concurrent_jobs = config.get('processing', {}).get('max_concurrent_jobs', 3)
        self.active_jobs = set()
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        logging.info("JobWorker initialized.")

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        logging.info(f"Received signal {signum}, shutting down gracefully...")
        self.running = False

    async def run(self):
        """Main worker loop."""
        logging.info("Starting job worker...")
        
        try:
            while self.running:
                # Check if we can start more jobs
                if len(self.active_jobs) < self.max_concurrent_jobs:
                    job = self.job_manager.get_next_job()
                    
                    if job:
                        # Start job in background
                        asyncio.create_task(self._process_job(job))
                    else:
                        # No jobs available, wait a bit
                        await asyncio.sleep(5)
                else:
                    # At capacity, wait a bit
                    await asyncio.sleep(2)
                    
        except Exception as e:
            logging.error(f"Worker loop error: {e}")
        finally:
            # Wait for active jobs to complete
            if self.active_jobs:
                logging.info(f"Waiting for {len(self.active_jobs)} active jobs to complete...")
                await asyncio.gather(*self.active_jobs, return_exceptions=True)
            
            logging.info("Job worker stopped.")

    async def _process_job(self, job):
        """Process a single job."""
        self.active_jobs.add(job.id)
        
        try:
            logging.info(f"Processing job {job.id} ({job.job_type.value}) for response {job.response_id}")
            
            # Update job status to running
            self.job_manager.update_job_status(job.id, JobStatus.RUNNING)
            
            # Process based on job type
            if job.job_type == JobType.EMOTION_ANALYSIS:
                await self._process_emotion_analysis(job)
            elif job.job_type == JobType.FEATURE_EXTRACTION:
                await self._process_feature_extraction(job)
            elif job.job_type == JobType.MODEL_CALCULATION:
                await self._process_model_calculation(job)
            else:
                raise ValueError(f"Unknown job type: {job.job_type}")
            
            # Mark job as completed
            self.job_manager.update_job_status(job.id, JobStatus.COMPLETED)
            logging.info(f"Completed job {job.id}")
            
        except Exception as e:
            error_msg = f"Job {job.id} failed: {str(e)}"
            logging.error(error_msg)
            
            # Try to retry the job
            if self.job_manager.retry_job(job.id):
                logging.info(f"Job {job.id} scheduled for retry")
            else:
                # Mark as failed
                self.job_manager.update_job_status(job.id, JobStatus.FAILED, str(e))
                
        finally:
            self.active_jobs.discard(job.id)

    async def _process_emotion_analysis(self, job):
        """Process emotion analysis job."""
        response_id = job.response_id
        
        # Get response data
        response_data = self.data_loader.get_response_with_media(response_id)
        if not response_data:
            raise Exception(f"Response {response_id} not found")
        
        media_files = self.data_loader.get_media_files_for_response(response_data)
        emotion_timeseries_data = []
        
        # Process video file if available
        if media_files['video_path']:
            try:
                local_video_path = self.data_loader.download_media_file(media_files['video_path'])
                video_emotions = self.emotion_processor.process_media(local_video_path)
                emotion_timeseries_data.extend(video_emotions)
                # Clean up local file
                os.remove(local_video_path)
            except Exception as e:
                logging.warning(f"Failed to process video for response {response_id}: {e}")
        
        # Process audio file if available (and no video was processed)
        elif media_files['audio_path']:
            try:
                local_audio_path = self.data_loader.download_media_file(media_files['audio_path'])
                audio_emotions = self.emotion_processor.process_media(local_audio_path)
                emotion_timeseries_data.extend(audio_emotions)
                # Clean up local file
                os.remove(local_audio_path)
            except Exception as e:
                logging.warning(f"Failed to process audio for response {response_id}: {e}")
        
        # Store emotion data
        if emotion_timeseries_data:
            self.data_storer.store_emotion_data(response_id, emotion_timeseries_data)
            
            # Cache the results for dependent jobs
            self.job_manager.cache_result(job.id, 'emotion_data', emotion_timeseries_data)
        else:
            raise Exception("No emotion data was extracted")

    async def _process_feature_extraction(self, job):
        """Process feature extraction job."""
        response_id = job.response_id
        
        # Get response data
        response_data = self.data_loader.get_response_with_media(response_id)
        if not response_data:
            raise Exception(f"Response {response_id} not found")
        
        # Try to get cached emotion data
        emotion_timeseries = self.job_manager.get_cached_result(job.id, 'emotion_data')
        if not emotion_timeseries:
            # If not cached, try to load from database
            # This is a simplified approach - in practice, you'd need to query the emotion timeseries table
            emotion_timeseries = []
        
        # TODO: Load skin potential data from timeseries table
        sp_timeseries = []
        
        # Extract features
        features = self.feature_extractor.extract_features_for_response(
            response_data, sp_timeseries, emotion_timeseries
        )
        
        # Cache the features
        self.job_manager.cache_result(job.id, 'features', features)
        
        # Store features in metadata for now (could be a separate table later)
        self.job_manager.update_job_status(job.id, JobStatus.COMPLETED)

    async def _process_model_calculation(self, job):
        """Process model calculation job."""
        response_id = job.response_id
        
        # Get cached features
        features = self.job_manager.get_cached_result(job.id, 'features')
        if not features:
            raise Exception("Features not found in cache")
        
        # Run Kawasaki Model
        result = self.kawasaki_model.calculate(features)
        
        # Store results
        run_id = job.run_id  # This should be set when creating the job
        self.data_storer.store_analysis_result(run_id, response_id, result)
        
        # Cache the final result
        self.job_manager.cache_result(job.id, 'final_result', result)

async def main():
    """Main entry point for the job worker."""
    import yaml
    
    # Load configuration
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    # Create and run worker
    worker = JobWorker(config)
    await worker.run()

if __name__ == '__main__':
    asyncio.run(main())
