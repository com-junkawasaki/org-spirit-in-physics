import argparse
import yaml
import logging
import os
import sys
from datetime import datetime
from neo4j import GraphDatabase

# Add project root to path to allow importing from packages
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from packages.spirit_in_physics_pipeline.data_loader import DataLoader

logger = logging.getLogger(__name__)
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
    async def
    async def generate_visualizations(self, run_id: str, config: dict) -> str:
        """Activity to generate visualizations for a completed analysis run."""
        try:
            # Initialize Neo4j client
            driver = GraphDatabase.driver(config['neo4j']['uri'],
                                        auth=(config['neo4j']['user'], config['neo4j']['password']))

            with driver.session(database=config['neo4j']['database']) as session:
                # Query analysis results using Cypher
                cypher_query = """
                MATCH (r:AnalysisResult {run_id: $run_id})
                RETURN r.spirit_probability as PValue,
                       r.word2vec_component as Word2Vec,
                       r.reaction_time_component as ReactionTime,
                       r.skin_potential_component as SkinPotential,
                       r.emotion_component as Emotion
                """

                results_response = list(session.run(cypher_query, {"run_id": run_id}))

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
                            "raw_inputs": {}  # TODO: Add raw inputs from Neo4j schema
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
            return f"Failed to connect to Neo4j for run_id: {run_id}, error: {str(e)}"

    async def
    async def run_analysis_pipeline(self, model_version: str, notes: str, config: dict) -> str:
        """Activity to run the main analysis pipeline."""
        try:
            logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
            logging.info("Starting analysis pipeline activity...")

            # Initialize Neo4j client
            driver = GraphDatabase.driver(config['neo4j']['uri'],
                                        auth=(config['neo4j']['user'], config['neo4j']['password']))

            with driver.session(database=config['neo4j']['database']) as session:
                # Create analysis run record
                run_id = f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

                run_data = {
                    'id': run_id,
                    'model_version': model_version,
                    'notes': notes,
                    'status': 'running',
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat(),
                    'total_sessions': 0,
                    'processed_sessions': 0,
                    'failed_sessions': 0
                }

                # Insert run record
                session.run("CREATE (r:AnalysisRun $run_data) RETURN r", {"run_data": run_data})

                # Query for sessions that need processing
                cypher_query = """
                MATCH (s:ExperimentSession)
                WHERE s.status = 'IMPORT_COMPLETED'
                RETURN s.id as _key,
                       s.participant_id as participant_id,
                       s.status as status
                """

                sessions = list(session.run(cypher_query))

                logging.info(f"Found {len(sessions)} sessions ready for analysis")

                processed_count = 0
                failed_count = 0

                for session_record in sessions:
                    try:
                        session_id = session_record['session_id']
                        logging.info(f"Processing session: {session_id}")

                        # Get Hume AI data for this session
                        hume_query = """
                        MATCH (s:ExperimentSession {id: $session_id})-[:HAS_HUME_DATA]->(h:HumeAnalysisJob)-[:HAS_BURST_PREDICTION]->(b:HumeBurstPrediction)
                        RETURN b
                        """
                        hume_data = list(session.run(hume_query, {"session_id": session_id}))

                        # Get physiological data
                        physio_query = """
                        MATCH (s:ExperimentSession {id: $session_id})-[:HAS_PHYSIOLOGICAL_DATA]->(p:PhysiologicalData)
                        RETURN p
                        """
                        physio_data = list(session.run(physio_query, {"session_id": session_id}))

                    # Extract features
                    features = self._extract_features(hume_data, physio_data, config)

                    # Run Kawasaki model
                    spirit_probability = self._calculate_spirit_probability(features, config)

                        # Store results
                        import uuid
                        result_id = str(uuid.uuid4())
                        result_data = {
                            'id': result_id,
                            'run_id': run_id,
                            'session_id': session_id,
                            'participant_id': session_record['participant_id'],
                            'spirit_probability': spirit_probability,
                            'features': features,
                            'model_version': model_version,
                            'processed_at': datetime.now().isoformat(),
                            'status': 'completed'
                        }

                        session.run("""
                            MATCH (r:AnalysisRun {id: $run_id})
                            MATCH (s:ExperimentSession {id: $session_id})
                            CREATE (r)-[:HAS_RESULT]->(res:AnalysisResult $result_data)-[:FOR_SESSION]->(s)
                            RETURN res
                        """, {"run_id": run_id, "session_id": session_id, "result_data": result_data})

                    processed_count += 1
                    logging.info(f"Completed analysis for session {session_id}")

                except Exception as session_error:
                    logging.error(f"Failed to process session {session_id}: {session_error}")
                    failed_count += 1

                # Update run status
                session.run("""
                    MATCH (r:AnalysisRun {id: $run_id})
                    SET r.status = 'completed',
                        r.total_sessions = $total_sessions,
                        r.processed_sessions = $processed_sessions,
                        r.failed_sessions = $failed_sessions,
                        r.updated_at = $updated_at
                    RETURN r
                """, {
                    "run_id": run_id,
                    "total_sessions": len(sessions),
                    "processed_sessions": processed_count,
                    "failed_sessions": failed_count,
                    "updated_at": datetime.now().isoformat()
                })

            logging.info(f"Analysis pipeline completed: {processed_count} processed, {failed_count} failed")
            return f"Analysis pipeline completed successfully. Run ID: {run_id}, Processed: {processed_count} sessions"

        except Exception as e:
            logging.error(f"Analysis pipeline failed: {e}")
            return f"Analysis pipeline failed: {str(e)}"

    def _extract_features(self, hume_data: list, physio_data: list, config: dict) -> dict:
        """Extract features from Hume AI and physiological data."""
        features = {
            'emotional_features': {},
            'physiological_features': {},
            'combined_features': {}
        }

        # Extract emotional features from Hume data
        if hume_data:
            emotions = {}
            expressions = {}

            for burst in hume_data:
                # Aggregate emotions across time
                for emotion, score in burst.get('emotions', {}).items():
                    if emotion not in emotions:
                        emotions[emotion] = []
                    emotions[emotion].append(score)

                # Aggregate expressions
                for expression, score in burst.get('expressions', {}).items():
                    if expression not in expressions:
                        expressions[expression] = []
                    expressions[expression].append(score)

            # Calculate averages
            features['emotional_features'] = {
                emotion: sum(scores) / len(scores) for emotion, scores in emotions.items()
            }
            features['expression_features'] = {
                expression: sum(scores) / len(scores) for expression, scores in expressions.items()
            }

        # Extract physiological features
        if physio_data:
            sp_values = [d.get('skin_potential', 0) for d in physio_data]
            if sp_values:
                features['physiological_features'] = {
                    'mean_sp': sum(sp_values) / len(sp_values),
                    'std_sp': (sum((x - sum(sp_values)/len(sp_values))**2 for x in sp_values) / len(sp_values))**0.5,
                    'min_sp': min(sp_values),
                    'max_sp': max(sp_values)
                }

        return features

    def _calculate_spirit_probability(self, features: dict, config: dict) -> float:
        """Calculate spirit probability using Kawasaki model."""
        # This is a simplified implementation
        # In real implementation, this would use the actual Kawasaki model

        emotional_score = 0
        physio_score = 0

        # Emotional component
        emotion_weights = {'joy': 0.3, 'contentment': 0.2, 'love': 0.2, 'pride': 0.15, 'realization': 0.15}
        emotional_features = features.get('emotional_features', {})

        for emotion, weight in emotion_weights.items():
            if emotion in emotional_features:
                emotional_score += emotional_features[emotion] * weight

        # Physiological component
        physio_features = features.get('physiological_features', {})
        if physio_features:
            # Higher variability in skin potential might indicate emotional response
            physio_score = min(physio_features.get('std_sp', 0) * 2, 1.0)

        # Combined score (simplified)
        combined_score = (emotional_score * 0.7) + (physio_score * 0.3)

        # Apply sigmoid to get probability
        import math
        spirit_probability = 1 / (1 + math.exp(-5 * (combined_score - 0.5)))

        return round(spirit_probability, 4)