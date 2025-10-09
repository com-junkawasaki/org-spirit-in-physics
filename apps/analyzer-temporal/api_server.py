#!/usr/bin/env python3
"""
REST API server for Spirit Analysis Temporal workflows.
Provides endpoints for backend integration.
"""

import asyncio
import logging
import uuid
from typing import Dict, Any, Optional
from flask import Flask, request, jsonify
from flask_cors import CORS
import yaml

from client import SpiritAnalysisClient
from shared.models import AnalysisResults

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

app = Flask(__name__)
CORS(app)

# Global client instance
analysis_client = None

def get_client() -> SpiritAnalysisClient:
    """Get or create analysis client."""
    global analysis_client
    if analysis_client is None:
        analysis_client = SpiritAnalysisClient()
        asyncio.run(analysis_client.connect())
    return analysis_client

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'spirit-analysis-temporal'
    })

@app.route('/api/workflows/start', methods=['POST'])
def start_workflow():
    """Start a new analysis workflow."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        workflow_id = data.get('workflowId')
        session_id = data.get('sessionId')
        parameters = data.get('parameters', {})

        if not workflow_id or not session_id:
            return jsonify({'error': 'workflowId and sessionId are required'}), 400

        # Convert session_id to UUID for validation
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            return jsonify({'error': 'Invalid sessionId format'}), 400

        # Extract stimulus words from parameters
        stimulus_words = parameters.get('stimulus_words', ['head', 'green', 'water', 'death', 'mother'])
        output_dir = parameters.get('output_dir')

        # Start workflow asynchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            # Use the provided workflow_id as custom workflow ID
            started_workflow_id = loop.run_until_complete(
                analysis_client.start_analysis_workflow(
                    stimulus_words=stimulus_words,
                    output_dir=output_dir,
                    custom_workflow_id=workflow_id
                )
            )

            return jsonify({
                'workflowId': started_workflow_id,
                'status': 'started',
                'message': 'Analysis workflow started successfully'
            })

        finally:
            loop.close()

    except Exception as e:
        logging.error(f"Error starting workflow: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/workflows/<workflow_id>/status', methods=['GET'])
def get_workflow_status(workflow_id: str):
    """Get the status of a workflow."""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            status = loop.run_until_complete(
                analysis_client.get_workflow_status(workflow_id)
            )

            return jsonify({
                'workflowId': workflow_id,
                'status': status.name if hasattr(status, 'name') else str(status)
            })

        finally:
            loop.close()

    except Exception as e:
        logging.error(f"Error getting workflow status: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/workflows/<workflow_id>/result', methods=['GET'])
def get_workflow_result(workflow_id: str):
    """Get the result of a completed workflow."""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            result = loop.run_until_complete(
                analysis_client.get_workflow_result(workflow_id)
            )

            if result is None:
                return jsonify({'error': 'Workflow result not available'}), 404

            # Convert AnalysisResults to dict
            result_dict = {
                'workflowId': workflow_id,
                'spiritProbability': result.spirit_probability,
                'emotionComponents': result.emotion_components,
                'word2vecSimilarity': result.word2vec_similarity,
                'reactionTimeScore': result.reaction_time_score,
                'physiologicalData': result.physiological_data,
                'reportUrl': result.report_url,
                'visualizationUrls': result.visualization_urls
            }

            return jsonify(result_dict)

        finally:
            loop.close()

    except Exception as e:
        logging.error(f"Error getting workflow result: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/workflows/<workflow_id>', methods=['DELETE'])
def cancel_workflow(workflow_id: str):
    """Cancel a running workflow."""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            loop.run_until_complete(
                analysis_client.cancel_workflow(workflow_id)
            )

            return jsonify({
                'workflowId': workflow_id,
                'status': 'cancelled',
                'message': 'Workflow cancellation requested'
            })

        finally:
            loop.close()

    except Exception as e:
        logging.error(f"Error cancelling workflow: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/workflows/running', methods=['GET'])
def list_running_workflows():
    """List all running workflows."""
    try:
        # This would need to be implemented in the client
        # For now, return empty list
        return jsonify({
            'workflows': [],
            'count': 0
        })

    except Exception as e:
        logging.error(f"Error listing workflows: {e}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description='Spirit Analysis Temporal API Server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=8081, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')

    args = parser.parse_args()

    # Initialize client
    global analysis_client
    analysis_client = SpiritAnalysisClient()

    # Start Flask app
    logging.info(f"Starting API server on {args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=args.debug)

if __name__ == '__main__':
    main()
