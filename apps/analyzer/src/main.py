import argparse
import yaml
import logging
import os
from pipeline.data_loader import DataLoader
from pipeline.emotion_processor import EmotionProcessor
from pipeline.feature_extractor import FeatureExtractor
from pipeline.kawasaki_model import KawasakiModel
from pipeline.data_storer import DataStorer

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def main():
    parser = argparse.ArgumentParser(description="Spirit in Physics Analysis Pipeline")
    parser.add_argument('--config', type=str, default='config.yaml', help='Path to the configuration file.')
    parser.add_argument('--model-version', type=str, required=True, help='Version of the model being run.')
    parser.add_argument('--notes', type=str, default='', help='Notes for this analysis run.')
    args = parser.parse_args()

    logging.info("Starting analysis pipeline...")

    # --- 1. Load Configuration ---
    logging.info(f"Loading configuration from {args.config}")
    with open(args.config, 'r') as f:
        config = yaml.safe_load(f)

    # --- 2. Initialize Components ---
    logging.info("Initializing pipeline components...")
    data_loader = DataLoader(config['supabase'])
    emotion_processor = EmotionProcessor(config['hume_ai'])
    feature_extractor = FeatureExtractor(config['model_params'])
    kawasaki_model = KawasakiModel(config['model_params'], config['word2vec'])
    data_storer = DataStorer(config['supabase'])

    # --- 3. Create Analysis Run ---
    run_id = data_storer.create_analysis_run(args.model_version, config['model_params'], args.notes)
    logging.info(f"Created analysis run with ID: {run_id}")

    # --- 4. Main Workflow ---
    # a. Get data that needs processing
    responses = data_loader.get_unprocessed_responses()
    logging.info(f"Found {len(responses)} new responses to process.")

    for response in responses:
        try:
            logging.info(f"Processing response ID: {response['id']}")

            # b. Get media file paths for this response
            media_files = data_loader.get_media_files_for_response(response)
            emotion_timeseries_data = []

            # Process video file if available
            if media_files['video_path']:
                try:
                    local_video_path = data_loader.download_media_file(media_files['video_path'])
                    video_emotions = emotion_processor.process_media(local_video_path)
                    emotion_timeseries_data.extend(video_emotions)
                    # Clean up local file
                    os.remove(local_video_path)
                except Exception as e:
                    logging.warning(f"Failed to process video for response {response['id']}: {e}")

            # Process audio file if available (and no video was processed)
            elif media_files['audio_path']:
                try:
                    local_audio_path = data_loader.download_media_file(media_files['audio_path'])
                    audio_emotions = emotion_processor.process_media(local_audio_path)
                    emotion_timeseries_data.extend(audio_emotions)
                    # Clean up local file
                    os.remove(local_audio_path)
                except Exception as e:
                    logging.warning(f"Failed to process audio for response {response['id']}: {e}")

            # c. Store emotion data
            if emotion_timeseries_data:
                data_storer.store_emotion_data(response['id'], emotion_timeseries_data)

            # d. Extract features
            # TODO: Load skin potential data from timeseries table
            sp_timeseries = []  # Placeholder - load from database
            features = feature_extractor.extract_features_for_response(
                response, sp_timeseries, emotion_timeseries_data
            )

            # e. Run Kawasaki Model
            result = kawasaki_model.calculate(features)

            # f. Store results
            data_storer.store_analysis_result(run_id, response['id'], result)

            logging.info(f"Successfully processed response ID: {response['id']}")

        except Exception as e:
            logging.error(f"Failed to process response ID {response['id']}: {e}")

    logging.info("Analysis pipeline finished.")

if __name__ == '__main__':
    main()
