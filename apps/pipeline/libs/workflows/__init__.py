"""
Workflow definitions library for Spirit in Physics Pipeline.

This library contains workflow definitions and orchestration logic
used by the workflow orchestrator service.
"""

from .definitions import create_unified_pipeline_workflow, create_analysis_workflow

__all__ = ["create_unified_pipeline_workflow", "create_analysis_workflow"]
