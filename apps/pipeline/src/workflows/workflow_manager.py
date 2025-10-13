"""
Serverless Workflow Manager for Spirit in Physics Pipeline

This module provides workflow management using the Serverless Workflow SDK,
replacing the previous Temporal-based workflow system.
"""

import os
from typing import Dict, Any, Optional, List
from pathlib import Path

from serverlessworkflow.sdk.workflow import Workflow
from serverlessworkflow.sdk.workflow_validator import WorkflowValidator
from serverlessworkflow.sdk.state_machine_helper import StateMachineHelper

from .workflow_definitions import get_all_workflows, get_workflow_by_id

# Merkle DAG: workflow_manager -> workflow_definitions
class ServerlessWorkflowManager:
    """
    Manages Serverless Workflow definitions and execution.

    This class loads workflow definitions from Python code and provides
    methods to validate, execute, and visualize workflows using the
    Serverless Workflow SDK.
    """

    def __init__(self):
        """
        Initialize the workflow manager.
        """
        self.workflows: Dict[str, Workflow] = {}
        self._load_workflows()

    def _load_workflows(self):
        """Load all workflow definitions from Python functions."""
        try:
            self.workflows = get_all_workflows()
            print(f"Loaded {len(self.workflows)} workflows: {list(self.workflows.keys())}")
        except Exception as e:
            print(f"Failed to load workflows: {e}")
            raise

    def get_workflow(self, workflow_id: str) -> Workflow:
        """
        Get a workflow by ID.

        Args:
            workflow_id: The workflow identifier

        Returns:
            Workflow object

        Raises:
            KeyError: If workflow not found
        """
        if workflow_id not in self.workflows:
            available = list(self.workflows.keys())
            raise KeyError(f"Workflow '{workflow_id}' not found. Available: {available}")

        return self.workflows[workflow_id]

    def list_workflows(self) -> List[str]:
        """List all available workflow IDs."""
        return list(self.workflows.keys())

    def validate_workflow(self, workflow_id: str) -> bool:
        """
        Validate a workflow definition.

        Args:
            workflow_id: The workflow identifier

        Returns:
            True if valid, raises exception if invalid
        """
        workflow = self.get_workflow(workflow_id)
        validator = WorkflowValidator(workflow)
        validator.validate()
        return True

    def validate_all_workflows(self) -> Dict[str, bool]:
        """
        Validate all loaded workflows.

        Returns:
            Dictionary mapping workflow IDs to validation status
        """
        results = {}
        for workflow_id in self.workflows.keys():
            try:
                self.validate_workflow(workflow_id)
                results[workflow_id] = True
            except Exception as e:
                print(f"Validation failed for {workflow_id}: {e}")
                results[workflow_id] = False
        return results

    def generate_workflow_graph(self, workflow_id: str, output_path: str,
                               get_actions: bool = True, subflows: Optional[List[Workflow]] = None) -> str:
        """
        Generate a workflow state machine graph.

        Args:
            workflow_id: The workflow identifier
            output_path: Path to save the graph image
            get_actions: Whether to include actions in the graph
            subflows: Optional list of subflow workflows

        Returns:
            Mermaid code for the workflow graph
        """
        workflow = self.get_workflow(workflow_id)
        helper = StateMachineHelper(workflow=workflow, get_actions=get_actions, subflows=subflows or [])

        # Generate Mermaid code instead of saving image
        mermaid_code = helper.draw(graph_engine='mermaid')

        # Optionally save to file if output_path is specified
        if output_path:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            with open(output_file, 'w') as f:
                f.write(mermaid_code)

        return mermaid_code

    def get_workflow_info(self, workflow_id: str) -> Dict[str, Any]:
        """
        Get information about a workflow.

        Args:
            workflow_id: The workflow identifier

        Returns:
            Dictionary with workflow information
        """
        workflow = self.get_workflow(workflow_id)
        return {
            "id": workflow.id,
            "name": workflow.name,
            "description": workflow.description,
            "version": workflow.version,
            "spec_version": workflow.specVersion,
            "start_state": workflow.start,
            "states_count": len(workflow.states) if workflow.states else 0,
            "functions_count": len(workflow.functions) if workflow.functions else 0
        }

    def export_workflow(self, workflow_id: str, format: str = "yaml") -> str:
        """
        Export a workflow definition.

        Args:
            workflow_id: The workflow identifier
            format: Export format ("yaml" or "json")

        Returns:
            Workflow definition as string
        """
        workflow = self.get_workflow(workflow_id)

        if format.lower() == "json":
            return workflow.to_json()
        else:
            return workflow.to_yaml()

# Global workflow manager instance
_workflow_manager = None

def get_workflow_manager() -> ServerlessWorkflowManager:
    """Get the global workflow manager instance."""
    global _workflow_manager
    if _workflow_manager is None:
        _workflow_manager = ServerlessWorkflowManager()
    return _workflow_manager

# Convenience functions for easy access
def list_available_workflows() -> List[str]:
    """List all available workflow IDs."""
    return get_workflow_manager().list_workflows()

def get_workflow(workflow_id: str) -> Workflow:
    """Get a workflow by ID."""
    return get_workflow_manager().get_workflow(workflow_id)

def validate_workflow(workflow_id: str) -> bool:
    """Validate a workflow."""
    return get_workflow_manager().validate_workflow(workflow_id)

def generate_workflow_graph(workflow_id: str, output_path: str = None) -> str:
    """Generate workflow graph."""
    return get_workflow_manager().generate_workflow_graph(workflow_id, output_path)
