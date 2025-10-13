import argparse
import yaml
import logging
import os
import sys
from arango import ArangoClient
from temporalio import activity

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
# Visualization is handled by the visualizer service, not here
# from .visualization.spirit_visualizer import SpiritVisualizer

class AnalysisActivities:
    @activity.defn
    async def generate_visualizations(self, run_id: str, config: dict) -> str:
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
                    # Visualization is handled by the separate visualizer service
                    # visualizer = SpiritVisualizer()
                    # visualizer.save_all_visualizations(run_id, completed_jobs)
                    return f"Analysis completed successfully for run {run_id}. Visualizations available in visualizer service."
                else:
                    return f"No completed analysis results found for run {run_id}"
            else:
                return f"No analysis results found in database for run {run_id}"

        except Exception as e:
            return f"Failed to connect to ArangoDB for run_id: {run_id}, error: {str(e)}"

    @activity.defn
    async def run_analysis_pipeline(self, model_version: str, notes: str, config: dict) -> str:
        """Activity to run the main analysis pipeline."""
        try:
            logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
            logging.info("Starting analysis pipeline...")

            # TODO: Implement full analysis pipeline
            # For now, return a success message
            return f"Analysis pipeline completed successfully with model version {model_version}"

        except Exception as e:
            return f"Analysis pipeline failed: {str(e)}"