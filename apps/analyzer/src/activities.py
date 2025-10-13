import argparse
import yaml
import logging
import os
import sys
from arango import ArangoClient

# Add project root to path to allow importing from packages
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from packages.spirit_in_physics_pipeline.data_loader import DataLoader
from packages.spirit_in_physics_pipeline.emotion_processor import EmotionProcessor
from packages.spirit_in_physics_pipeline.feature_extractor import FeatureExtractor
from packages.spirit_in_physics_pipeline.kawasaki_model import KawasakiModel
from packages.spirit_in_physics_pipeline.data_storer import DataStorer
from packages.spirit_in_physics_pipeline.job_manager import JobManager, JobType, JobStatus
from packages.spirit_in_physics_pipeline.physiological_processor import PhysiologicalProcessor
from packages.spirit_in_physics_pipeline.hume_data_processor import HumeDataProcessor
from .visualization.spirit_visualizer import SpiritVisualizer

async def generate_visualizations(run_id: str, config: dict) -> str:
    """Activity to generate visualizations for a completed analysis run."""
    try:
        # Initialize ArangoDB client
        client = ArangoClient(hosts=config['arangodb']['url'])
        db = client.db(config['arangodb']['database'], username=config['arangodb']['user'], password=config['arangodb']['password'])

        # Query analysis results using AQL
        aql_query = """
        FOR result IN analysis_results
            FILTER result.run_id == @run_id
            RETURN {
                PValue: result.p_value,
                Word2Vec: result.word2vec_component,
                ReactionTime: result.reaction_time_component,
                SkinPotential: result.skin_potential_component,
                Emotion: result.emotion_component
            }
        """

        results_response = list(db.aql.execute(aql_query, bind_vars={"run_id": run_id}))

        if results_response:
            completed_jobs = []
            for result in results_response:
                completed_jobs.append({
                    "p_value": result['PValue'],
                    "components": {
                        "word2vec": result['Word2Vec'],
                        "reaction_time": result['ReactionTime'],
                        "skin_potential": result['SkinPotential'],
                        "emotion": result['Emotion']
                    },
                    "raw_inputs": {}  # TODO: Add raw inputs from ArangoDB schema
                })

            if completed_jobs:
                visualizer = SpiritVisualizer()
                visualizer.save_all_visualizations(run_id, completed_jobs)
                return f"Visualizations generated successfully for run {run_id}"
            else:
                return f"No completed analysis results found for visualization for run {run_id}"
        else:
            return f"No analysis results found in database for run {run_id}"

    except Exception as e:
        return f"Failed to connect to ArangoDB for run_id: {run_id}, error: {str(e)}"

async def run_analysis_pipeline(model_version: str, notes: str, config: dict) -> str:
    """Activity to run the main analysis pipeline."""
    try:
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
        logging.info("Starting analysis pipeline...")

        # --- 1. Initialize Components ---
        logging.info("Initializing pipeline components...")
        data_loader = DataLoader(config['arangodb'])
        emotion_processor = EmotionProcessor(config['hume_ai'])
        hume_data_processor = HumeDataProcessor(config['arangodb'])
        physiological_processor = PhysiologicalProcessor()
        feature_extractor = FeatureExtractor(config['model_params'])
        kawasaki_model = KawasakiModel(config['model_params'], config['word2vec'])
        data_storer = DataStorer(config['arangodb'])

        # --- 2. Create Analysis Run ---
        run_id = data_storer.create_analysis_run(model_version, config['model_params'], notes)
        logging.info(f"Created analysis run with ID: {run_id}")

        # --- 3. Main Workflow ---
        # a. Get data that needs processing
        responses = data_loader.get_unprocessed_responses()
        logging.info(f"Found {len(responses)} new responses to process.")

        processed_count = 0
        for response in responses:
            response_id = response.get('_key')  # ArangoDB's default key
            if not response_id:
                logging.warning("Skipping response without a '_key'.")
                continue

            try:
                logging.info(f"Processing response ID: {response_id}")

                # b. Load Hume AI emotion data from database
                # Find the experiment session for this response
                experiment_session = data_loader.get_experiment_session_for_response(response_id)
                emotion_timeseries_data = []

                if experiment_session:
                    try:
                        # Load Hume AI data for this experiment session
                        hume_data = hume_data_processor.process_hume_data_for_session(experiment_session['id'])
                        emotion_timeseries_data = hume_data.get('emotion_timeseries', [])
                        logging.info(f"Loaded {len(emotion_timeseries_data)} Hume emotion data points for response {response_id}")
                    except Exception as e:
                        logging.warning(f"Failed to load Hume data for response {response_id}: {e}")
                else:
                    logging.warning(f"No experiment session found for response {response_id}")

                # c. Store emotion data (if we have Hume data)
                if emotion_timeseries_data:
                    data_storer.store_emotion_data(response_id, emotion_timeseries_data)

                # d. Load and process physiological data
                sp_timeseries = data_loader.load_skin_potential_data(response_id)

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
                data_storer.store_analysis_result(run_id, response_id, result)

                processed_count += 1
                logging.info(f"Successfully processed response ID: {response_id}")

            except Exception as e:
                logging.error(f"Failed to process response ID {response_id}: {e}")

        logging.info(f"Analysis pipeline finished. Processed {processed_count} responses.")
        return f"Analysis completed successfully. Run ID: {run_id}, Processed: {processed_count} responses"

    except Exception as e:
        logging.error(f"Analysis pipeline failed: {e}")
        return f"Analysis pipeline failed: {str(e)}"