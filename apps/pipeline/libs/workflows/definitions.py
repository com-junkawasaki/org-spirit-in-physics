"""
Workflow definitions for Spirit in Physics Pipeline.

This module contains workflow definitions using serverless workflow specifications.
"""

from typing import Dict, Any, List
from libs.shared.models import WorkflowDefinition
from libs.shared.utils import now_utc


def create_unified_pipeline_workflow() -> Dict[str, Any]:
    """
    Create the unified pipeline workflow definition.

    This workflow handles the complete pipeline for Spirit in Physics
    data processing and analysis.
    """
    return {
        "id": "unified-pipeline-workflow",
        "name": "Unified Pipeline Workflow",
        "description": "Complete pipeline for Spirit in Physics data processing and analysis",
        "version": "1.0",
        "specVersion": "0.8",
        "start": "DataIngestion",
        "states": [
            {
                "name": "DataIngestion",
                "type": "operation",
                "actions": [
                    {
                        "functionRef": {
                            "refName": "ingest-participant-data",
                            "arguments": {
                                "participantId": "${.participantId}"
                            }
                        }
                    }
                ],
                "transition": "Analysis"
            },
            {
                "name": "Analysis",
                "type": "operation",
                "actions": [
                    {
                        "functionRef": {
                            "refName": "run-kawasaki-analysis",
                            "arguments": {
                                "sessionId": "${.sessionId}",
                                "modelVersion": "1.0"
                            }
                        }
                    }
                ],
                "transition": "Validation"
            },
            {
                "name": "Validation",
                "type": "operation",
                "actions": [
                    {
                        "functionRef": {
                            "refName": "validate-results",
                            "arguments": {
                                "resultId": "${.resultId}"
                            }
                        }
                    }
                ],
                "end": True
            }
        ],
        "functions": [
            {
                "name": "ingest-participant-data",
                "type": "rest",
                "uri": "http://data-ingestion:8001/api/ingest"
            },
            {
                "name": "run-kawasaki-analysis",
                "type": "rest",
                "uri": "http://analysis-engine:8002/api/analyze"
            },
            {
                "name": "validate-results",
                "type": "rest",
                "uri": "http://analysis-engine:8002/api/validate"
            }
        ]
    }


def create_analysis_workflow() -> Dict[str, Any]:
    """
    Create analysis-only workflow definition.

    This workflow focuses on running analysis on existing data.
    """
    return {
        "id": "analysis-workflow",
        "name": "Analysis Workflow",
        "description": "Analysis workflow for existing participant data",
        "version": "1.0",
        "specVersion": "0.8",
        "start": "LoadData",
        "states": [
            {
                "name": "LoadData",
                "type": "operation",
                "actions": [
                    {
                        "functionRef": {
                            "refName": "load-participant-session",
                            "arguments": {
                                "participantId": "${.participantId}",
                                "sessionId": "${.sessionId}"
                            }
                        }
                    }
                ],
                "transition": "HumeAnalysis"
            },
            {
                "name": "HumeAnalysis",
                "type": "operation",
                "actions": [
                    {
                        "functionRef": {
                            "refName": "run-hume-analysis",
                            "arguments": {
                                "sessionId": "${.sessionId}"
                            }
                        }
                    }
                ],
                "transition": "KawasakiModel"
            },
            {
                "name": "KawasakiModel",
                "type": "operation",
                "actions": [
                    {
                        "functionRef": {
                            "refName": "calculate-spirit-probability",
                            "arguments": {
                                "sessionId": "${.sessionId}",
                                "humeResults": "${.humeResults}",
                                "physiologicalData": "${.physiologicalData}"
                            }
                        }
                    }
                ],
                "transition": "SaveResults"
            },
            {
                "name": "SaveResults",
                "type": "operation",
                "actions": [
                    {
                        "functionRef": {
                            "refName": "store-analysis-results",
                            "arguments": {
                                "result": "${.analysisResult}"
                            }
                        }
                    }
                ],
                "end": True
            }
        ],
        "functions": [
            {
                "name": "load-participant-session",
                "type": "rest",
                "uri": "http://storage-adapter:8004/api/sessions/load"
            },
            {
                "name": "run-hume-analysis",
                "type": "rest",
                "uri": "http://analysis-engine:8002/api/hume/analyze"
            },
            {
                "name": "calculate-spirit-probability",
                "type": "rest",
                "uri": "http://analysis-engine:8002/api/kawasaki/calculate"
            },
            {
                "name": "store-analysis-results",
                "type": "rest",
                "uri": "http://storage-adapter:8004/api/results/store"
            }
        ]
    }


def get_workflow_definitions() -> List[WorkflowDefinition]:
    """Get all available workflow definitions."""
    return [
        WorkflowDefinition(
            id="unified-pipeline",
            name="Unified Pipeline",
            description="Complete data ingestion and analysis pipeline",
            version="1.0",
            definition=create_unified_pipeline_workflow(),
            created_at=now_utc(),
            updated_at=now_utc()
        ),
        WorkflowDefinition(
            id="analysis-only",
            name="Analysis Only",
            description="Analysis workflow for existing data",
            version="1.0",
            definition=create_analysis_workflow(),
            created_at=now_utc(),
            updated_at=now_utc()
        )
    ]
