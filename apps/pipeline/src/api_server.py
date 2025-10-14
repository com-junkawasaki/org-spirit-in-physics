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
    """Import Hume AI analysis data into Neo4j database."""

    def __init__(self, neo4j_config):
        from neo4j import GraphDatabase

        self.driver = GraphDatabase.driver(neo4j_config['uri'], auth=(neo4j_config['user'], neo4j_config['password']))
        self.database = neo4j_config['database']
        self.config = neo4j_config

    def import_hume_data(self, artifact_path, participant_experiment_session_id):
        """Import Hume AI data from artifact folder."""
        try:
            with self.driver.session(database=self.database) as session:
                # Extract Hume job ID from folder name
                folder_name = os.path.basename(artifact_path)
                hume_job_id = folder_name.replace('HumeAI_artifacts_', '')

                # Create analysis job record
                import uuid
                job_id = str(uuid.uuid4())

                job_data = {
                    'id': job_id,
                    'participant_experiment_session_id': participant_experiment_session_id,
                    'source_media_path': artifact_path,
                    'hume_job_id': hume_job_id,
                    'status': 'completed',  # Since we're importing completed data
                    'created_at': datetime.now().isoformat()
                }

                session.run("""
                    CREATE (j:HumeAnalysisJob $job_data)
                    RETURN j
                """, {"job_data": job_data})

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
                                self._import_burst_data(session, burst_file, job_id)

                            # Import prosody predictions
                            prosody_file = os.path.join(csv_subdir, 'prosody.csv')
                            if os.path.exists(prosody_file):
                                self._import_prosody_data(session, prosody_file, job_id)

                            # Import language predictions
                            language_file = os.path.join(csv_subdir, 'language.csv')
                            if os.path.exists(language_file):
                                self._import_language_data(session, language_file, job_id)

            return {"job_id": job_id, "status": "success", "message": "Hume AI data imported successfully"}

        except Exception as e:
            logging.error(f"Error importing Hume data: {e}")
            raise e

    def _import_burst_data(self, session, csv_file, job_id):
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

            import uuid
            burst_id = str(uuid.uuid4())
            burst_data = {
                'id': burst_id,
                'job_id': job_id,
                'begin_time': float(row['BeginTime']),
                'end_time': float(row['EndTime']),
                'emotions': json.dumps(emotions),
                'expressions': json.dumps(expressions),
                'created_at': datetime.now().isoformat()
            }

            session.run("""
                MATCH (j:HumeAnalysisJob {id: $job_id})
                CREATE (j)-[:HAS_BURST_PREDICTION]->(b:HumeBurstPrediction $burst_data)
                RETURN b
            """, {"job_id": job_id, "burst_data": burst_data})

    def _import_prosody_data(self, session, csv_file, job_id):
        """Import prosody prediction data."""
        df = pd.read_csv(csv_file)

        for _, row in df.iterrows():
            # Extract emotion scores
            emotions = {}

            for col in df.columns:
                if col not in ['Id', 'Text', 'BeginTime', 'EndTime', 'Confidence', 'SpeakerConfidence']:
                    emotions[col] = float(row[col])

            import uuid
            prosody_id = str(uuid.uuid4())
            prosody_data = {
                'id': prosody_id,
                'job_id': job_id,
                'begin_time': float(row['BeginTime']),
                'end_time': float(row['EndTime']),
                'confidence': float(row['Confidence']) if pd.notna(row['Confidence']) else None,
                'emotions': json.dumps(emotions),
                'created_at': datetime.now().isoformat()
            }

            session.run("""
                MATCH (j:HumeAnalysisJob {id: $job_id})
                CREATE (j)-[:HAS_PROSODY_PREDICTION]->(p:HumeProsodyPrediction $prosody_data)
                RETURN p
            """, {"job_id": job_id, "prosody_data": prosody_data})

    def _import_language_data(self, session, csv_file, job_id):
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

            import uuid
            language_id = str(uuid.uuid4())
            language_data = {
                'id': language_id,
                'job_id': job_id,
                'text': str(row['Text']) if pd.notna(row['Text']) else None,
                'begin_time': float(row['BeginTime']) if pd.notna(row['BeginTime']) else None,
                'end_time': float(row['EndTime']) if pd.notna(row['EndTime']) else None,
                'confidence': float(row['Confidence']) if pd.notna(row['Confidence']) else None,
                'speaker_confidence': float(row['SpeakerConfidence']) if pd.notna(row['SpeakerConfidence']) else None,
                'emotions': json.dumps(emotions),
                'toxicity': json.dumps(toxicity),
                'created_at': datetime.now().isoformat()
            }

            session.run("""
                MATCH (j:HumeAnalysisJob {id: $job_id})
                CREATE (j)-[:HAS_LANGUAGE_PREDICTION]->(l:HumeLanguagePrediction $language_data)
                RETURN l
            """, {"job_id": job_id, "language_data": language_data})

class AnalysisAPI:
    def __init__(self, config):
        # self.job_manager = JobManager(config['arangodb'])  # Temporal disabled
        self.data_storer = DataStorer(config['arangodb'])
        self.hume_importer = HumeDataImporter(config.get('neo4j', config.get('arangodb', {})))
        self.neo4j_config = config.get('neo4j', config.get('arangodb', {}))  # Store config for direct DB access
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
                # Get runs from Neo4j
                from neo4j import GraphDatabase
                driver = GraphDatabase.driver(self.neo4j_config['uri'],
                                            auth=(self.neo4j_config['user'], self.neo4j_config['password']))

                with driver.session(database=self.neo4j_config['database']) as session:
                    # Query analysis runs
                    cypher_query = """
                    MATCH (r:AnalysisRun)
                    RETURN r.id as _key,
                           r.participant_id as participant_id,
                           r.status as status,
                           r.progress as progress,
                           r.model_version as model_version,
                           r.notes as notes,
                           r.created_at as created_at,
                           r.updated_at as updated_at
                    ORDER BY r.created_at DESC
                    LIMIT 50
                    """

                    result = session.run(cypher_query)
                    runs = [dict(record) for record in result]

                driver.close()
                return jsonify({"runs": runs})
            except Exception as e:
                logging.error(f"Error listing runs: {e}")
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/runs/<run_id>', methods=['GET'])
        def get_run(run_id):
            """Get details of a specific run."""
            try:
                # Get run details from Neo4j
                from neo4j import GraphDatabase
                driver = GraphDatabase.driver(self.neo4j_config['uri'],
                                            auth=(self.neo4j_config['user'], self.neo4j_config['password']))

                with driver.session(database=self.neo4j_config['database']) as session:
                    # Get run details
                    run_query = """
                    MATCH (r:AnalysisRun {id: $run_id})
                    RETURN r
                    """
                    result = session.run(run_query, {"run_id": run_id})
                    runs = list(result)

                if not runs:
                    return jsonify({"error": "Run not found"}), 404

                run = dict(runs[0]['r'])
                
                # Get analysis results for this run
                results_query = """
                MATCH (r:AnalysisRun {id: $run_id})<-[:HAS_RESULT]-(res:AnalysisResult)
                RETURN res
                """
                results_result = session.run(results_query, {"run_id": run_id})
                results = [dict(record['res']) for record in results_result]
                
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
                from neo4j import GraphDatabase
                driver = GraphDatabase.driver(self.neo4j_config['uri'],
                                            auth=(self.neo4j_config['user'], self.neo4j_config['password']))

                with driver.session(database=self.neo4j_config['database']) as session:
                    run_query = """
                    MATCH (r:AnalysisRun {id: $run_id})
                    RETURN r
                    """
                    runs_result = session.run(run_query, {"run_id": run_id})
                    runs = list(runs_result)
                
                if not runs:
                    return jsonify({"error": "Run not found"}), 404

                run = dict(runs[0]['r'])

                # Get analysis results to determine progress
                results_query = """
                MATCH (r:AnalysisRun {id: $run_id})<-[:HAS_RESULT]-(res:AnalysisResult)
                RETURN res
                """
                results_result = session.run(results_query, {"run_id": run_id})
                results = [dict(record['res']) for record in results_result]
                
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

        @self.app.route('/api/workflows/start-import', methods=['POST'])
        def start_import_workflow():
            """Start data import workflow via Serverless Workflow SDK."""
            import asyncio

            async def async_start_import():
                try:
                    from .run_worker import get_workflow_runner

                    data = request.get_json()
                    if not data:
                        return jsonify({"error": "Request body is required"}), 400

                    session_id = data.get('sessionId')
                    participant_id = data.get('participantId')

                    if not session_id:
                        return jsonify({"error": "sessionId is required"}), 400

                    # Get workflow runner and execute import workflow
                    runner = get_workflow_runner()
                    workflow_id = f"import-{session_id}-{uuid.uuid4()}"

                    # Execute data import workflow
                    result = await runner.execute_workflow(
                        "data_import",
                        participant_ids=[participant_id],
                        session_id=session_id,
                        workflow_id=workflow_id
                    )

                    return {
                        "workflow_id": workflow_id,
                        "status": "started",
                        "session_id": session_id,
                        "participant_id": participant_id,
                        "execution_result": result
                    }

                except Exception as e:
                    logging.error(f"Error starting import workflow: {e}")
                    raise e

            try:
                result = asyncio.run(async_start_import())
                return jsonify(result)
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        @self.app.route('/api/workflows/start-analysis', methods=['POST'])
        def start_analysis_workflow():
            """Start analysis workflow via Serverless Workflow SDK."""
            import asyncio

            async def async_start_workflow():
                try:
                    from .run_worker import get_workflow_runner

                    data = request.get_json()
                    if not data:
                        return {"error": "Request body is required"}, 400

                    session_ids = data.get('sessionIds', [])
                    model_version = data.get('modelVersion', '1.0')
                    notes = data.get('notes', '')
                    experiment_type = data.get('experimentType', 'unified')  # 'physiological', 'online', or 'unified'

                    if not session_ids:
                        return {"error": "sessionIds is required"}, 400

                    # Get workflow runner and execute appropriate workflow
                    runner = get_workflow_runner()
                    workflow_id = f"{experiment_type}-analysis-{uuid.uuid4()}"

                    # Map experiment type to workflow type
                    workflow_type_map = {
                        'physiological': 'physiological',
                        'online': 'online',
                        'unified': 'unified_pipeline'
                    }
                    workflow_type = workflow_type_map.get(experiment_type, 'unified_pipeline')

                    # Execute workflow
                    result = await runner.execute_workflow(
                        workflow_type,
                        session_ids=session_ids,
                        model_version=model_version,
                        notes=notes,
                        workflow_id=workflow_id
                    )

                    return {
                        "workflow_id": workflow_id,
                        "status": "started",
                        "experiment_type": experiment_type,
                        "session_ids": session_ids,
                        "model_version": model_version,
                        "notes": notes,
                        "execution_result": result
                    }

                except Exception as e:
                    logging.error(f"Error starting analysis workflow: {e}")
                    raise e

            try:
                result = asyncio.run(async_start_workflow())
                return jsonify(result)
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        @self.app.route('/api/workflows/validate', methods=['POST'])
        def validate_workflows():
            """Validate all workflows using Serverless Workflow SDK."""
            import asyncio

            async def async_validate():
                try:
                    from .run_worker import get_workflow_runner

                    runner = get_workflow_runner()
                    validation_results = runner.validate_workflows()

                    return {
                        "validation_results": validation_results,
                        "summary": {
                            "total_workflows": len(validation_results),
                            "valid_workflows": sum(1 for v in validation_results.values() if v),
                            "invalid_workflows": sum(1 for v in validation_results.values() if not v)
                        }
                    }

                except Exception as e:
                    logging.error(f"Error validating workflows: {e}")
                    raise e

            try:
                result = asyncio.run(async_validate())
                return jsonify(result)
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        @self.app.route('/api/workflows/list', methods=['GET'])
        def list_workflows():
            """List all available workflows with their information."""
            import asyncio

            async def async_list():
                try:
                    from .run_worker import get_workflow_runner

                    runner = get_workflow_runner()
                    workflow_info = runner.get_workflow_info()

                    return {
                        "workflows": workflow_info,
                        "total_count": len(workflow_info)
                    }

                except Exception as e:
                    logging.error(f"Error listing workflows: {e}")
                    raise e

            try:
                result = asyncio.run(async_list())
                return jsonify(result)
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        @self.app.route('/api/workflows/<workflow_id>/visualize', methods=['GET'])
        def visualize_workflow(workflow_id):
            """Generate workflow visualization (Mermaid diagram)."""
            import asyncio

            async def async_visualize():
                try:
                    from .workflows.workflow_manager import get_workflow_manager

                    manager = get_workflow_manager()

                    # Generate Mermaid code
                    mermaid_code = manager.generate_workflow_graph(workflow_id)

                    return {
                        "workflow_id": workflow_id,
                        "mermaid_code": mermaid_code,
                        "format": "mermaid"
                    }

                except Exception as e:
                    logging.error(f"Error visualizing workflow {workflow_id}: {e}")
                    raise e

            try:
                result = asyncio.run(async_visualize())
                return jsonify(result)
            except Exception as e:
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
