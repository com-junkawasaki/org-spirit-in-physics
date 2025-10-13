#!/usr/bin/env python3
"""
Import Status API for Spirit in Physics Importer

This module provides REST API endpoints for managing import status.
"""

import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import yaml
import sys
import os

# Add project root to path
sys.path.append('/app')

from packages.spirit_in_physics_pipeline.import_status_manager import ImportStatusManager, ImportStatus, ImportType

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class ImportStatusAPI:
    """REST API for import status management."""
    
    def __init__(self, config):
        self.status_manager = ImportStatusManager(config['arangodb'])
        self.app = Flask(__name__)
        CORS(self.app)  # Enable CORS for web frontend access
        self._setup_routes()
    
    def _setup_routes(self):
        """Set up API routes."""
        
        @self.app.route('/health', methods=['GET'])
        def health_check():
            return jsonify({"status": "healthy", "service": "spirit-in-physics-import-status-api"})
        
        @self.app.route('/import-status', methods=['GET'])
        def get_all_import_statuses():
            """Get all import status records."""
            try:
                statuses = self.status_manager.get_all_import_statuses()
                return jsonify({
                    "statuses": [
                        {
                            "participant_id": s.participant_id,
                            "status": s.status.value,
                            "import_type": s.import_type.value,
                            "imported_at": s.imported_at,
                            "last_updated": s.last_updated,
                            "data_sources": s.data_sources,
                            "records_count": s.records_count,
                            "error_message": s.error_message,
                            "metadata": s.metadata
                        }
                        for s in statuses
                    ]
                })
            except Exception as e:
                logging.error(f"Error getting import statuses: {e}")
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/import-status/<participant_id>', methods=['GET'])
        def get_import_status(participant_id):
            """Get import status for a specific participant."""
            try:
                status = self.status_manager.get_import_status(participant_id)
                if not status:
                    return jsonify({"error": "Import status not found"}), 404
                
                return jsonify({
                    "participant_id": status.participant_id,
                    "status": status.status.value,
                    "import_type": status.import_type.value,
                    "imported_at": status.imported_at,
                    "last_updated": status.last_updated,
                    "data_sources": status.data_sources,
                    "records_count": status.records_count,
                    "error_message": status.error_message,
                    "metadata": status.metadata
                })
            except Exception as e:
                logging.error(f"Error getting import status for {participant_id}: {e}")
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/import-status/<participant_id>', methods=['POST'])
        def create_import_status(participant_id):
            """Create import status for a participant."""
            try:
                data = request.get_json()
                if not data:
                    return jsonify({"error": "Request body is required"}), 400
                
                import_type = ImportType(data.get('import_type', 'participant_data'))
                data_sources = data.get('data_sources', [])
                
                success = self.status_manager.create_import_status(
                    participant_id, import_type, data_sources
                )
                
                if success:
                    return jsonify({"message": "Import status created successfully"})
                else:
                    return jsonify({"error": "Failed to create import status"}), 500
                    
            except Exception as e:
                logging.error(f"Error creating import status for {participant_id}: {e}")
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/import-status/<participant_id>', methods=['PUT'])
        def update_import_status(participant_id):
            """Update import status for a participant."""
            try:
                data = request.get_json()
                if not data:
                    return jsonify({"error": "Request body is required"}), 400
                
                status = ImportStatus(data.get('status'))
                error_message = data.get('error_message')
                records_count = data.get('records_count')
                metadata = data.get('metadata')
                
                success = self.status_manager.update_import_status(
                    participant_id, status, error_message, records_count, metadata
                )
                
                if success:
                    return jsonify({"message": "Import status updated successfully"})
                else:
                    return jsonify({"error": "Failed to update import status"}), 500
                    
            except Exception as e:
                logging.error(f"Error updating import status for {participant_id}: {e}")
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/import-status/summary', methods=['GET'])
        def get_import_summary():
            """Get import status summary."""
            try:
                summary = self.status_manager.get_import_summary()
                return jsonify(summary)
            except Exception as e:
                logging.error(f"Error getting import summary: {e}")
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/import-status/by-status/<status>', methods=['GET'])
        def get_participants_by_status(status):
            """Get participant IDs by import status."""
            try:
                import_status = ImportStatus(status)
                participant_ids = self.status_manager.get_participants_by_status(import_status)
                return jsonify({"participant_ids": participant_ids})
            except ValueError:
                return jsonify({"error": f"Invalid status: {status}"}), 400
            except Exception as e:
                logging.error(f"Error getting participants by status {status}: {e}")
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/import-jobs', methods=['GET'])
        def get_pending_import_jobs():
            """Get all pending import jobs."""
            try:
                jobs = self.status_manager.get_pending_import_jobs()
                return jsonify({"jobs": jobs})
            except Exception as e:
                logging.error(f"Error getting pending import jobs: {e}")
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/import-jobs', methods=['POST'])
        def create_import_job():
            """Create a new import job."""
            try:
                data = request.get_json()
                if not data:
                    return jsonify({"error": "Request body is required"}), 400
                
                participant_id = data.get('participant_id')
                job_type = data.get('job_type')
                priority = data.get('priority', 0)
                metadata = data.get('metadata', {})
                
                if not participant_id or not job_type:
                    return jsonify({"error": "participant_id and job_type are required"}), 400
                
                job_id = self.status_manager.create_import_job(
                    participant_id, job_type, priority, metadata
                )
                
                if job_id:
                    return jsonify({"job_id": job_id, "message": "Import job created successfully"})
                else:
                    return jsonify({"error": "Failed to create import job"}), 500
                    
            except Exception as e:
                logging.error(f"Error creating import job: {e}")
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/import-jobs/<job_id>', methods=['PUT'])
        def update_import_job(job_id):
            """Update import job status."""
            try:
                data = request.get_json()
                if not data:
                    return jsonify({"error": "Request body is required"}), 400
                
                status = data.get('status')
                error_message = data.get('error_message')
                
                if not status:
                    return jsonify({"error": "status is required"}), 400
                
                success = self.status_manager.update_import_job_status(
                    job_id, status, error_message
                )
                
                if success:
                    return jsonify({"message": "Import job updated successfully"})
                else:
                    return jsonify({"error": "Failed to update import job"}), 500
                    
            except Exception as e:
                logging.error(f"Error updating import job {job_id}: {e}")
                return jsonify({"error": str(e)}), 500
    
    def run(self, host='0.0.0.0', port=8001, debug=False):
        """Run the API server."""
        logging.info(f"Starting Import Status API server on {host}:{port}")
        self.app.run(host=host, port=port, debug=debug)

def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Spirit in Physics Import Status API")
    parser.add_argument('--config', type=str, default='config.yaml', help='Path to the configuration file.')
    parser.add_argument('--port', type=int, default=8001, help='Port to run the API server on.')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode.')
    
    args = parser.parse_args()
    
    # Load configuration
    config_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', args.config)
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    # Create and run API server
    api = ImportStatusAPI(config)
    api.run(port=args.port, debug=args.debug)

if __name__ == "__main__":
    main()
