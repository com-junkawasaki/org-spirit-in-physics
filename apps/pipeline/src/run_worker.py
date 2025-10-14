"""
Serverless Workflow Runner for Spirit in Physics Pipeline

This module provides workflow execution using the Serverless Workflow SDK,
replacing the previous Temporal-based worker system.
"""

import asyncio
import os
import threading
import json
from typing import Dict, Any

from .workflows.main_workflow import (
    execute_ingestion_workflow,
    execute_data_import_workflow,
    execute_physiological_workflow,
    execute_online_workflow,
    execute_unified_pipeline_workflow
)
from .workflows.workflow_manager import get_workflow_manager
from .api_server import AnalysisAPI

def run_api_server():
    """Run the API server in a separate thread."""
    config = {
        'arangodb': {  # Keep for backward compatibility
            'url': 'http://arangodb:8529',
            'database': 'spirit_in_physics',
            'user': 'root',
            'password': 'root'
        },
        'neo4j': {
            'uri': os.getenv('NEO4J_URI', 'neo4j://neo4j:7687'),
            'database': os.getenv('NEO4J_DATABASE', 'neo4j'),
            'user': os.getenv('NEO4J_USER', 'neo4j'),
            'password': os.getenv('NEO4J_PASSWORD', 'neo4jpassword')
        }
    }
    api = AnalysisAPI(config)
    print("Starting API server on port 8000...")
    api.run(host='0.0.0.0', port=8000, debug=False)

# Merkle DAG: workflow_runner -> workflow_execution
class ServerlessWorkflowRunner:
    """
    Runner for executing workflows defined using the Serverless Workflow SDK.

    This class provides methods to execute different types of workflows
    and manage workflow state using the SDK.
    """

    def __init__(self):
        self.workflow_manager = get_workflow_manager()
        self.config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        """Load configuration for workflow execution."""
        return {
            'arangodb': {  # Keep for backward compatibility
                'url': os.getenv('ARANGODB_URL', 'http://arangodb:8529'),
                'database': os.getenv('ARANGODB_DATABASE', 'spirit_in_physics'),
                'user': os.getenv('ARANGODB_USER', 'root'),
                'password': os.getenv('ARANGODB_PASSWORD', 'root')
            },
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

    async def execute_workflow(self, workflow_type: str, **kwargs) -> Dict[str, Any]:
        """
        Execute a workflow by type.

        Args:
            workflow_type: Type of workflow to execute
            **kwargs: Workflow-specific parameters

        Returns:
            Workflow execution results
        """
        print(f"Executing {workflow_type} workflow with params: {kwargs}")

        # Route to appropriate workflow executor
        if workflow_type == "ingestion":
            return await execute_ingestion_workflow(kwargs.get("session_id", ""))
        elif workflow_type == "data_import":
            return await execute_data_import_workflow(
                kwargs.get("participant_ids", []),
                kwargs.get("config", self.config)
            )
        elif workflow_type == "physiological":
            return await execute_physiological_workflow(
                kwargs.get("session_ids", []),
                kwargs.get("model_version", "1.0"),
                kwargs.get("notes", ""),
                kwargs.get("config", self.config)
            )
        elif workflow_type == "online":
            return await execute_online_workflow(
                kwargs.get("session_ids", []),
                kwargs.get("model_version", "1.0"),
                kwargs.get("notes", ""),
                kwargs.get("config", self.config)
            )
        elif workflow_type == "unified_pipeline":
            return await execute_unified_pipeline_workflow(
                kwargs.get("session_ids", []),
                kwargs.get("model_version", "1.0"),
                kwargs.get("notes", ""),
                kwargs.get("config", self.config)
            )
        else:
            raise ValueError(f"Unknown workflow type: {workflow_type}")

    def validate_workflows(self) -> Dict[str, bool]:
        """Validate all loaded workflows."""
        return self.workflow_manager.validate_all_workflows()

    def get_workflow_info(self) -> Dict[str, Any]:
        """Get information about available workflows."""
        workflows = self.workflow_manager.list_workflows()
        info = {}
        for workflow_id in workflows:
            try:
                info[workflow_id] = self.workflow_manager.get_workflow_info(workflow_id)
            except Exception as e:
                info[workflow_id] = {"error": str(e)}
        return info

# Global workflow runner instance
_workflow_runner = None

def get_workflow_runner() -> ServerlessWorkflowRunner:
    """Get the global workflow runner instance."""
    global _workflow_runner
    if _workflow_runner is None:
        _workflow_runner = ServerlessWorkflowRunner()
    return _workflow_runner

async def main():
    """Main function to run the workflow server."""
    print("Starting Serverless Workflow Runner for Spirit in Physics Pipeline...")

    # Initialize workflow runner
    runner = get_workflow_runner()

    # Validate workflows on startup
    print("Validating workflows...")
    validation_results = runner.validate_workflows()
    for workflow_id, is_valid in validation_results.items():
        status = "✓ VALID" if is_valid else "✗ INVALID"
        print(f"  {workflow_id}: {status}")

    # Start API server in a separate thread
    api_thread = threading.Thread(target=run_api_server, daemon=True)
    api_thread.start()

    print("Workflow runner initialized successfully.")
    print("Available workflows:")
    workflow_info = runner.get_workflow_info()
    for workflow_id, info in workflow_info.items():
        if "error" not in info:
            print(f"  - {workflow_id}: {info.get('description', 'No description')}")

    # Keep the server running
    try:
        while True:
            await asyncio.sleep(60)  # Sleep for 1 minute
            print("Workflow runner is running... (press Ctrl+C to stop)")
    except KeyboardInterrupt:
        print("Shutting down workflow runner...")

if __name__ == "__main__":
    asyncio.run(main())