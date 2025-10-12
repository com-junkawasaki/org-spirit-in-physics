#!/usr/bin/env python3
"""
Script to run Hume AI analysis jobs for all participant session videos.
"""

import asyncio
import logging
import yaml
import sys
import os
import glob
from pathlib import Path

# モジュールパスを追加
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))


from packages.spirit_in_physics_pipeline.emotion_processor import EmotionProcessor
from hume.models.config import FaceConfig, ProsodyConfig

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

async def run_hume_job_for_session(emotion_processor: EmotionProcessor, participant_id: str, session_video_path: str, output_dir: str):
    """Runs a single Hume AI job and saves the results."""
    session_name = Path(session_video_path).stem
    participant_output_dir = Path(output_dir) / participant_id / session_name
    participant_output_dir.mkdir(parents=True, exist_ok=True)

    predictions_file = participant_output_dir / "predictions.json"
    job_id_file = participant_output_dir / "job_id.txt"

    if predictions_file.exists():
        logging.info(f"Predictions already exist for {participant_id} - {session_name}. Skipping.")
        return

    logging.info(f"Starting Hume AI job for {participant_id} - {session_name}")

    try:
        # Start batch job
        configs = [FaceConfig(), ProsodyConfig()]
        job = await emotion_processor.client.expression_measurement.batch.start_inference_job(
            files=[session_video_path],
            configs=configs
        )

        logging.info(f"Started Hume AI job: {job.id}")

        with open(job_id_file, 'w') as f:
            f.write(job.id)

        # Wait for job completion
        await emotion_processor._wait_for_job_completion(job)

        # Get predictions
        predictions = await job.get_predictions()

        # Save predictions
        import json
        with open(predictions_file, 'w') as f:
            json.dump(predictions, f, indent=2)

        logging.info(f"Successfully saved predictions for {participant_id} - {session_name} to {predictions_file}")

    except Exception as e:
        logging.error(f"Failed to process {session_video_path}: {e}")
        import traceback
        traceback.print_exc()

async def main():
    """Main function to run all jobs."""
    
    # 設定読み込み
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    # EmotionProcessor初期化
    emotion_processor = EmotionProcessor(config['hume_ai'])

    if not emotion_processor.use_real_api:
        logging.error("This script requires the real Hume AI API to be enabled. Please check USE_REAL_API in emotion_processor.py")
        return

    participants_dir = Path("dataset/participants")
    output_dir = Path("dataset/hume_data_organized")
    output_dir.mkdir(exist_ok=True)

    participant_dirs = [d for d in participants_dir.iterdir() if d.is_dir()]

    for participant_dir in participant_dirs:
        participant_id = participant_dir.name
        session_videos = glob.glob(str(participant_dir / "session-*-video.webm"))

        for session_video_path in session_videos:
            await run_hume_job_for_session(emotion_processor, participant_id, session_video_path, str(output_dir))

if __name__ == '__main__':
    asyncio.run(main())
