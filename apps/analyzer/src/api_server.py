#!/usr/bin/env python3
"""
REST API server for accessing Spirit in Physics analysis results.
"""

import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import yaml

from pipeline.job_manager import JobManager, JobStatus
from pipeline.data_storer import DataStorer

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class AnalysisAPI:
    def __init__(self, config):
        self.job_manager = JobManager(config['supabase'])
        self.data_storer = DataStorer(config['supabase'])
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
