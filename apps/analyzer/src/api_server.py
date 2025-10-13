#!/usr/bin/env python3
"""
REST API server for accessing Spirit in Physics analysis results.
"""

import json
import logging
import os
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
import yaml
import pandas as pd

# Add project root to path to allow importing from packages
import sys
import os
sys.path.append('/app')

# from packages.spirit_in_physics_pipeline.job_manager import JobManager, JobStatus  # Temporal disabled
from packages.spirit_in_physics_pipeline.data_storer import DataStorer

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class HumeDataImporter:
    """Import Hume AI analysis data into ArangoDB database."""

    def __init__(self, arangodb_config):
        from arango import ArangoClient

        client = ArangoClient(hosts=arangodb_config['url'])
        self.db = client.db(arangodb_config['database'], username=arangodb_config['user'], password=arangodb_config['password'])
        self.config = arangodb_config

    def import_hume_data(self, artifact_path, participant_experiment_session_id):
        """Import Hume AI data from artifact folder."""
        try:
            # Extract Hume job ID from folder name
            folder_name = os.path.basename(artifact_path)
            hume_job_id = folder_name.replace('HumeAI_artifacts_', '')

            # Create analysis job record
            job_data = {
                'participant_experiment_session_id': participant_experiment_session_id,
                'source_media_path': artifact_path,
                'hume_job_id': hume_job_id,
                'status': 'completed'  # Since we're importing completed data
            }

            import uuid
            job_data['_key'] = str(uuid.uuid4())
            job_collection = self.db.collection('participant_hume_analysis_jobs')
            job_result = job_collection.insert(job_data)
            job_id = job_data['_key']

            # Find CSV directories - there might be multiple registry files
            registry_dirs = [d for d in os.listdir(artifact_path) if d.startswith('registry_file-') and os.path.isdir(os.path.join(artifact_path, d))]

            for registry_dir in registry_dirs:
                registry_path = os.path.join(artifact_path, registry_dir)
                csv_dir = os.path.join(registry_path, 'csv')

                if os.path.exists(csv_dir):
                    # Get the job ID subdirectory (last part of hume_job_id)
                    job_subdirs = [d for d in os.listdir(csv_dir) if os.path.isdir(os.path.join(csv_dir, d))]
                    if job_subdirs:
                        csv_subdir = os.path.join(csv_dir, job_subdirs[0])

                        # Import burst predictions
                        burst_file = os.path.join(csv_subdir, 'burst.csv')
                        if os.path.exists(burst_file):
                            self._import_burst_data(burst_file, job_id)

                        # Import prosody predictions
                        prosody_file = os.path.join(csv_subdir, 'prosody.csv')
                        if os.path.exists(prosody_file):
                            self._import_prosody_data(prosody_file, job_id)

                        # Import language predictions
                        language_file = os.path.join(csv_subdir, 'language.csv')
                        if os.path.exists(language_file):
                            self._import_language_data(language_file, job_id)

            return {"job_id": job_id, "status": "success", "message": "Hume AI data imported successfully"}

        except Exception as e:
            logging.error(f"Error importing Hume data: {e}")
            raise e

    def _import_burst_data(self, csv_file, job_id):
        """Import burst prediction data."""
        df = pd.read_csv(csv_file)

        for _, row in df.iterrows():
            # Extract emotion scores (exclude Id, BeginTime, EndTime)
            emotions = {}
            expressions = {}

            for col in df.columns:
                if col not in ['Id', 'BeginTime', 'EndTime']:
                    if col in ['Cackle', 'Cheer', 'Chuckle', 'Cry', 'Gasp', 'Giggle', 'Groan', 'Growl', 'Grunt', 'Hiss', 'Hoot', 'Howl', 'Laugh', 'Moan', 'Pant', 'Roar', 'Scream', 'Screech', 'Shout', 'Shriek', 'Sigh', 'Snicker', 'Snort', 'Sob', 'Squeal', 'Wail', 'Wheep', 'Whimper', 'Yawn', 'Yelp', 'Ah', 'Aha', 'Ahh', 'Argh', 'Aww', 'Eek', 'Eww', 'Grr', 'Ha', 'Hah', 'Haha', 'Hehe', 'Hmm', 'Huh', 'Hurray', 'Mhm', 'Mmm', 'Oh', 'Ohh', 'Ooh', 'Ooph', 'Ouch', 'Oww', 'Pff', 'Phew', 'Tsk', 'Ugh', 'Uh', 'Uh-huh', 'Umm', 'Whee', 'Whew', 'Woah', 'Wow', 'Yay', 'Yippee', 'Yuck']:
                        expressions[col] = float(row[col])
                    else:
                        emotions[col] = float(row[col])

            burst_data = {
                'job_id': job_id,
                'begin_time': float(row['BeginTime']),
                'end_time': float(row['EndTime']),
                'emotions': json.dumps(emotions),
                'expressions': json.dumps(expressions)
            }

            import uuid
            burst_data['_key'] = str(uuid.uuid4())
            burst_collection = self.db.collection('participant_hume_burst_predictions')
            burst_collection.insert(burst_data)

    def _import_prosody_data(self, csv_file, job_id):
        """Import prosody prediction data."""
        df = pd.read_csv(csv_file)

        for _, row in df.iterrows():
            # Extract emotion scores
            emotions = {}

            for col in df.columns:
                if col not in ['Id', 'Text', 'BeginTime', 'EndTime', 'Confidence', 'SpeakerConfidence']:
                    emotions[col] = float(row[col])

            prosody_data = {
                'job_id': job_id,
                'begin_time': float(row['BeginTime']),
                'end_time': float(row['EndTime']),
                'confidence': float(row['Confidence']) if pd.notna(row['Confidence']) else None,
                'emotions': json.dumps(emotions)
            }

            import uuid
            prosody_data['_key'] = str(uuid.uuid4())
            prosody_collection = self.db.collection('participant_hume_prosody_predictions')
            prosody_collection.insert(prosody_data)

    def _import_language_data(self, csv_file, job_id):
        """Import language prediction data."""
        df = pd.read_csv(csv_file)

        for _, row in df.iterrows():
            # Extract emotion scores and toxicity scores
            emotions = {}
            toxicity = {}

            # Define emotion columns (from Hume AI documentation)
            emotion_cols = [
                'Admiration', 'Adoration', 'Aesthetic Appreciation', 'Amusement', 'Anger', 'Annoyance',
                'Anxiety', 'Awe', 'Awkwardness', 'Boredom', 'Calmness', 'Concentration', 'Confusion',
                'Contemplation', 'Contempt', 'Contentment', 'Craving', 'Determination', 'Disappointment',
                'Disapproval', 'Disgust', 'Distress', 'Doubt', 'Ecstasy', 'Embarrassment', 'Empathic Pain',
                'Enthusiasm', 'Entrancement', 'Envy', 'Excitement', 'Fear', 'Gratitude', 'Guilt', 'Horror',
                'Interest', 'Joy', 'Love', 'Nostalgia', 'Pain', 'Pride', 'Realization', 'Relief', 'Romance',
                'Sadness', 'Sarcasm', 'Satisfaction', 'Desire', 'Shame', 'Surprise (negative)',
                'Surprise (positive)', 'Sympathy', 'Tiredness', 'Triumph'
            ]

            # Define toxicity columns
            toxicity_cols = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'toxic', 'severe_toxic',
                           'obscene', 'threat', 'insult', 'identity_hate']

            for col in df.columns:
                if col in emotion_cols:
                    emotions[col] = float(row[col]) if pd.notna(row[col]) else 0.0
                elif col in toxicity_cols:
                    toxicity[col] = float(row[col]) if pd.notna(row[col]) else 0.0

            language_data = {
                'job_id': job_id,
                'text': str(row['Text']) if pd.notna(row['Text']) else None,
                'begin_time': float(row['BeginTime']) if pd.notna(row['BeginTime']) else None,
                'end_time': float(row['EndTime']) if pd.notna(row['EndTime']) else None,
                'confidence': float(row['Confidence']) if pd.notna(row['Confidence']) else None,
                'speaker_confidence': float(row['SpeakerConfidence']) if pd.notna(row['SpeakerConfidence']) else None,
                'emotions': json.dumps(emotions),
                'toxicity': json.dumps(toxicity)
            }

            import uuid
            language_data['_key'] = str(uuid.uuid4())
            language_collection = self.db.collection('participant_hume_language_predictions')
            language_collection.insert(language_data)

class AnalysisAPI:
    def __init__(self, config):
        # self.job_manager = JobManager(config['arangodb'])  # Temporal disabled
        self.data_storer = DataStorer(config['arangodb'])
        self.hume_importer = HumeDataImporter(config['arangodb'])
        self.arangodb_config = config['arangodb']  # Store config for direct DB access
        self.app = Flask(__name__)
        CORS(self.app)  # Enable CORS for web frontend access

        self._setup_routes()

    def _setup_routes(self):
        """Set up API routes."""
        
        @self.app.route('/health', methods=['GET'])
        def health_check():
            return jsonify({"status": "healthy", "service": "spirit-in-physics-analysis-api"})
        
        @self.app.route('/runs', methods=['GET'])
        def list_runs():
            """List all analysis runs."""
            try:
                # Get runs from ArangoDB
                from arango import ArangoClient
                client = ArangoClient(hosts=self.arangodb_config['url'])
                db = client.db(self.arangodb_config['database'], 
                             username=self.arangodb_config['user'], 
                             password=self.arangodb_config['password'])
                
                # Query analysis runs
                aql_query = """
                FOR run IN analysis_runs
                    SORT run.created_at DESC
                    LIMIT 50
                    RETURN {
                        _key: run._key,
                        _id: run._id,
                        participant_id: run.participant_id,
                        status: run.status,
                        progress: run.progress,
                        model_version: run.model_version,
                        notes: run.notes,
                        created_at: run.created_at,
                        updated_at: run.updated_at
                    }
                """
                
                runs = list(db.aql.execute(aql_query))
                return jsonify({"runs": runs})
            except Exception as e:
                logging.error(f"Error listing runs: {e}")
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/runs/<run_id>', methods=['GET'])
        def get_run(run_id):
            """Get details of a specific run."""
            try:
                # Get run details from ArangoDB
                from arango import ArangoClient
                client = ArangoClient(hosts=self.arangodb_config['url'])
                db = client.db(self.arangodb_config['database'], 
                             username=self.arangodb_config['user'], 
                             password=self.arangodb_config['password'])
                
                # Get run details
                run_query = """
                FOR run IN analysis_runs
                    FILTER run._key == @run_id
                    RETURN run
                """
                runs = list(db.aql.execute(run_query, bind_vars={"run_id": run_id}))
                
                if not runs:
                    return jsonify({"error": "Run not found"}), 404
                
                run = runs[0]
                
                # Get analysis results for this run
                results_query = """
                FOR result IN analysis_results
                    FILTER result.run_id == @run_id
                    RETURN result
                """
                results = list(db.aql.execute(results_query, bind_vars={"run_id": run_id}))
                
                # Calculate statistics
                total_results = len(results)
                successful_results = len([r for r in results if r.get('status') == 'completed'])
                failed_results = len([r for r in results if r.get('status') == 'failed'])
                
                run_data = {
                    "run_id": run_id,
                    "total_results": total_results,
                    "successful_results": successful_results,
                    "failed_results": failed_results,
                    "run_details": run,
                    "results": results
                }
                
                return jsonify(run_data)
            except Exception as e:
                logging.error(f"Error getting run details: {e}")
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/runs/<run_id>/pipeline-stages', methods=['GET'])
        def get_pipeline_stages(run_id):
            """Get pipeline stages and their status for a run."""
            try:
                # Define pipeline stages
                pipeline_stages = [
                    {
                        "id": "config_loading",
                        "name": "設定読み込み",
                        "description": "設定ファイルとパラメータの読み込み",
                        "order": 1
                    },
                    {
                        "id": "component_init",
                        "name": "コンポーネント初期化", 
                        "description": "データローダー、特徴量抽出器、川崎モデルの初期化",
                        "order": 2
                    },
                    {
                        "id": "run_creation",
                        "name": "分析実行作成",
                        "description": "分析実行レコードの作成とID生成",
                        "order": 3
                    },
                    {
                        "id": "data_processing",
                        "name": "データ処理",
                        "description": "未処理応答データの取得と前処理",
                        "order": 4
                    },
                    {
                        "id": "feature_extraction",
                        "name": "特徴量抽出",
                        "description": "生理データ、感情データ、言語データからの特徴量抽出",
                        "order": 5
                    },
                    {
                        "id": "model_calculation",
                        "name": "川崎モデル実行",
                        "description": "Spirit確率の計算とモデル実行",
                        "order": 6
                    },
                    {
                        "id": "result_storage",
                        "name": "結果保存・可視化",
                        "description": "分析結果の保存と可視化ファイル生成",
                        "order": 7
                    }
                ]
                
                # Get run details to determine current stage
                from arango import ArangoClient
                client = ArangoClient(hosts=self.arangodb_config['url'])
                db = client.db(self.arangodb_config['database'], 
                             username=self.arangodb_config['user'], 
                             password=self.arangodb_config['password'])
                
                run_query = """
                FOR run IN analysis_runs
                    FILTER run._key == @run_id
                    RETURN run
                """
                runs = list(db.aql.execute(run_query, bind_vars={"run_id": run_id}))
                
                if not runs:
                    return jsonify({"error": "Run not found"}), 404
                
                run = runs[0]
                
                # Get analysis results to determine progress
                results_query = """
                FOR result IN analysis_results
                    FILTER result.run_id == @run_id
                    RETURN result
                """
                results = list(db.aql.execute(results_query, bind_vars={"run_id": run_id}))
                
                # Determine current stage based on run status and results
                current_stage = "config_loading"
                if run.get('status') == 'running':
                    if results:
                        current_stage = "model_calculation"
                    else:
                        current_stage = "data_processing"
                elif run.get('status') == 'completed':
                    current_stage = "result_storage"
                elif run.get('status') == 'failed':
                    current_stage = "data_processing"  # Assume failure in data processing
                
                # Calculate progress for each stage
                total_responses = len(results) if results else 0
                completed_responses = len([r for r in results if r.get('status') == 'completed'])
                
                for stage in pipeline_stages:
                    stage_id = stage['id']
                    if stage_id == current_stage:
                        stage['status'] = 'running'
                        if stage_id == 'model_calculation' and total_responses > 0:
                            stage['progress'] = (completed_responses / total_responses) * 100
                        else:
                            stage['progress'] = 50  # Default progress for running stage
                    elif pipeline_stages.index(stage) < pipeline_stages.index(next(s for s in pipeline_stages if s['id'] == current_stage)):
                        stage['status'] = 'completed'
                        stage['progress'] = 100
                    else:
                        stage['status'] = 'pending'
                        stage['progress'] = 0
                
                return jsonify({
                    "run_id": run_id,
                    "current_stage": current_stage,
                    "total_responses": total_responses,
                    "completed_responses": completed_responses,
                    "stages": pipeline_stages
                })
                
            except Exception as e:
                logging.error(f"Error getting pipeline stages: {e}")
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/runs/<run_id>/results', methods=['GET'])
        def get_run_results(run_id):
            """Get analysis results for a run."""
            try:
                # This would need to be implemented to fetch results from analysis_results table
                # For now, return a placeholder
                return jsonify({
                    "run_id": run_id,
                    "results": [],
                    "message": "Results retrieval not yet fully implemented"
                })
            except Exception as e:
                logging.error(f"Error getting results for run {run_id}: {e}")
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/jobs/<job_id>', methods=['GET'])
        def get_job(job_id):
            """Get details of a specific job."""
            try:
                job = self.job_manager.get_job_status(job_id)
                
                if not job:
                    return jsonify({"error": "Job not found"}), 404
                
                job_data = {
                    "id": job.id,
                    "run_id": job.run_id,
                    "response_id": job.response_id,
                    "job_type": job.job_type.value,
                    "status": job.status.value,
                    "priority": job.priority,
                    "started_at": job.started_at.isoformat() if job.started_at else None,
                    "completed_at": job.completed_at.isoformat() if job.completed_at else None,
                    "error_message": job.error_message,
                    "retry_count": job.retry_count,
                    "max_retries": job.max_retries,
                    "metadata": job.metadata,
                    "created_at": job.created_at.isoformat(),
                    "updated_at": job.updated_at.isoformat()
                }
                
                return jsonify(job_data)
            except Exception as e:
                logging.error(f"Error getting job {job_id}: {e}")
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/jobs/<job_id>/retry', methods=['POST'])
        def retry_job(job_id):
            """Retry a failed job."""
            try:
                success = self.job_manager.retry_job(job_id)

                if success:
                    return jsonify({"message": f"Job {job_id} scheduled for retry"})
                else:
                    return jsonify({"error": f"Job {job_id} cannot be retried"}), 400

            except Exception as e:
                logging.error(f"Error retrying job {job_id}: {e}")
                return jsonify({"error": str(e)}), 500

        @self.app.route('/import/hume', methods=['POST'])
        def import_hume_data():
            """Import Hume AI analysis data."""
            try:
                data = request.get_json()

                if not data:
                    return jsonify({"error": "Request body is required"}), 400

                artifact_path = data.get('artifact_path')
                participant_experiment_session_id = data.get('participant_experiment_session_id')

                if not artifact_path:
                    return jsonify({"error": "artifact_path is required"}), 400

                if not participant_experiment_session_id:
                    return jsonify({"error": "participant_experiment_session_id is required"}), 400

                if not os.path.exists(artifact_path):
                    return jsonify({"error": f"Artifact path does not exist: {artifact_path}"}), 400

                # Import the data
                result = self.hume_importer.import_hume_data(artifact_path, participant_experiment_session_id)

                return jsonify(result)

            except Exception as e:
                logging.error(f"Error importing Hume data: {e}")
                return jsonify({"error": str(e)}), 500

    def run(self, host='0.0.0.0', port=8000, debug=False):
        """Run the API server."""
        logging.info(f"Starting API server on {host}:{port}")
        self.app.run(host=host, port=port, debug=debug)

def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Spirit in Physics Analysis API Server")
    parser.add_argument('--config', default='config.yaml', help='Configuration file path')
    parser.add_argument('--host', default='0.0.0.0', help='Server host')
    parser.add_argument('--port', type=int, default=8000, help='Server port')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    
    args = parser.parse_args()
    
    # Load configuration
    with open(args.config, 'r') as f:
        config = yaml.safe_load(f)
    
    # Create and run API server
    api = AnalysisAPI(config)
    api.run(host=args.host, port=args.port, debug=args.debug)

if __name__ == '__main__':
    main()
