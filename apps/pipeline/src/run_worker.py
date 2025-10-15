"""
Simple API Server Runner for Spirit in Physics Pipeline

This module provides a simple API server for the Spirit in Physics pipeline,
without complex workflow orchestration.
"""

import os
from .api_server import AnalysisAPI

def main():
    """Main function to run the API server."""
    print("Starting Spirit in Physics Pipeline API Server...")

    # Configuration
    config = {
        'neo4j': {
            'uri': os.getenv('NEO4J_URI', 'neo4j://neo4j:7687'),
            'database': os.getenv('NEO4J_DATABASE', 'neo4j'),
            'user': os.getenv('NEO4J_USER', 'neo4j'),
            'password': os.getenv('NEO4J_PASSWORD', 'neo4jpassword')
        },
        'hume_ai': {
            'api_key': os.getenv('HUME_API_KEY', 'dummy_key'),
            'client_id': os.getenv('HUME_CLIENT_ID', 'dummy_client'),
            'client_secret': os.getenv('HUME_CLIENT_SECRET', 'dummy_secret')
        }
    }

    # Initialize and start API server
    api = AnalysisAPI(config)
    print("API server initialized successfully.")
    print("Starting server on port 8000...")
    api.run(host='0.0.0.0', port=8000, debug=False)

if __name__ == "__main__":
    main()