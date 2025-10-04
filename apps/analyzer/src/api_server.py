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

from pipeline.job_manager import JobManager, JobStatus
from pipeline.data_storer import DataStorer

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class HumeDataImporter:
    """Import Hume AI analysis data into Supabase database."""

    def __init__(self, supabase_config):
        self.supabase_url = supabase_config['url']
        self.supabase_key = supabase_config['service_role_key']

        # Initialize Supabase client
        from supabase import create_client, Client
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)

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

            job_result = self.supabase.table('participant_hume_analysis_jobs').insert(job_data).execute()
            job_id = job_result.data[0]['id']

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

            self.supabase.table('participant_hume_burst_predictions').insert(burst_data).execute()

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

            self.supabase.table('participant_hume_prosody_predictions').insert(prosody_data).execute()

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

            self.supabase.table('participant_hume_language_predictions').insert(language_data).execute()

class AnalysisAPI:
    def __init__(self, config):
        self.job_manager = JobManager(config['supabase'])
        self.data_storer = DataStorer(config['supabase'])
        self.hume_importer = HumeDataImporter(config['supabase'])
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
                # This would need to be implemented in DataStorer
                # For now, return a placeholder
                return jsonify({"runs": [], "message": "Run listing not yet implemented"})
            except Exception as e:
                logging.error(f"Error listing runs: {e}")
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/runs/<run_id>', methods=['GET'])
        def get_run(run_id):
            """Get details of a specific run."""
            try:
                jobs = self.job_manager.get_jobs_by_run(run_id)
                
                # Calculate statistics
                total_jobs = len(jobs)
                completed = sum(1 for j in jobs if j.status == JobStatus.COMPLETED)
                failed = sum(1 for j in jobs if j.status == JobStatus.FAILED)
                running = sum(1 for j in jobs if j.status == JobStatus.RUNNING)
                queued = sum(1 for j in jobs if j.status == JobStatus.QUEUED)
                
                run_data = {
                    "run_id": run_id,
                    "total_jobs": total_jobs,
                    "completed_jobs": completed,
                    "failed_jobs": failed,
                    "running_jobs": running,
                    "queued_jobs": queued,
                    "progress_percentage": (completed / total_jobs * 100) if total_jobs > 0 else 0,
                    "jobs": [
                        {
                            "id": job.id,
                            "response_id": job.response_id,
                            "job_type": job.job_type.value,
                            "status": job.status.value,
                            "priority": job.priority,
                            "started_at": job.started_at.isoformat() if job.started_at else None,
                            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
                            "error_message": job.error_message,
                            "retry_count": job.retry_count,
                            "created_at": job.created_at.isoformat(),
                            "updated_at": job.updated_at.isoformat()
                        }
                        for job in jobs
                    ]
                }
                
                return jsonify(run_data)
            except Exception as e:
                logging.error(f"Error getting run {run_id}: {e}")
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
