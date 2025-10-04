import argparse
import yaml
import logging
import os
from pipeline.data_loader import DataLoader
from pipeline.emotion_processor import EmotionProcessor
from pipeline.feature_extractor import FeatureExtractor
from pipeline.kawasaki_model import KawasakiModel
from pipeline.data_storer import DataStorer
from pipeline.job_manager import JobManager, JobType, JobStatus
from pipeline.physiological_processor import PhysiologicalProcessor
from pipeline.hume_data_processor import HumeDataProcessor
from visualization.spirit_visualizer import SpiritVisualizer

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
    hume_data_processor = HumeDataProcessor(config['supabase'])
    physiological_processor = PhysiologicalProcessor()
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

            # b. Load Hume AI emotion data from database
            # Find the experiment session for this response
            experiment_session = data_loader.get_experiment_session_for_response(response['id'])
            emotion_timeseries_data = []

            if experiment_session:
                try:
                    # Load Hume AI data for this experiment session
                    hume_data = hume_data_processor.process_hume_data_for_session(experiment_session['id'])
                    emotion_timeseries_data = hume_data.get('emotion_timeseries', [])
                    logging.info(f"Loaded {len(emotion_timeseries_data)} Hume emotion data points for response {response['id']}")
                except Exception as e:
                    logging.warning(f"Failed to load Hume data for response {response['id']}: {e}")
            else:
                logging.warning(f"No experiment session found for response {response['id']}")

            # c. Store emotion data (if we have Hume data)
            if emotion_timeseries_data:
                data_storer.store_emotion_data(response['id'], emotion_timeseries_data)

            # d. Load and process physiological data
            sp_timeseries = data_loader.load_skin_potential_data(response['id'])

            # Process physiological data with our processor
            physiological_features = physiological_processor.extract_features_for_response(
                response, sp_timeseries
            )

            # e. Extract features combining physiological and emotion data
            features = feature_extractor.extract_features_for_response(
                response, sp_timeseries, emotion_timeseries_data
            )

            # Add physiological features to the feature set
            features.update(physiological_features)

            # f. Run Kawasaki Model
            result = kawasaki_model.calculate(features)

            # g. Store results
            data_storer.store_analysis_result(run_id, response['id'], result)

            logging.info(f"Successfully processed response ID: {response['id']}")

        except Exception as e:
            logging.error(f"Failed to process response ID {response['id']}: {e}")

    # 最終結果の取得と可視化
    if args.model_version and run_id:
        try:
            logging.info("Generating visualizations...")
            job_manager = JobManager(config['supabase'])

            # 完了したジョブの結果を取得
            completed_jobs = []
            for response in responses:
                job = job_manager.get_job_status(job_id)  # 実際のジョブIDが必要
                if job and job.status == JobStatus.COMPLETED:
                    # 結果を取得（簡易版）
                    completed_jobs.append({
                        "p_value": 0.5,  # モック値
                        "components": {"word2vec": 0.1, "reaction_time": 0.2, "skin_potential": 0.3, "emotion": 0.4},
                        "raw_inputs": response
                    })

            if completed_jobs:
                visualizer = SpiritVisualizer()
                visualizer.save_all_visualizations(run_id, completed_jobs)
                logging.info(f"Visualizations generated for run {run_id}")

        except Exception as e:
            logging.error(f"Failed to generate visualizations: {e}")

    logging.info("Analysis pipeline finished.")

if __name__ == '__main__':
    main()
