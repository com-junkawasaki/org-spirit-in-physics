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


def create_participants_import_workflow() -> Dict[str, Any]:
    """
    Create participants data import workflow.

    This workflow imports participant data from the dataset directory,
    processing each participant's files individually.
    """
    return {
        "id": "participants-import-workflow",
        "name": "Participants Import Workflow",
        "description": "Import participant data from dataset directory",
        "version": "1.0",
        "specVersion": "0.8",
        "start": "ScanParticipants",
        "states": [
            {
                "name": "ScanParticipants",
                "type": "operation",
                "actions": [
                    {
                        "functionRef": {
                            "refName": "scan-participants-directory",
                            "arguments": {}
                        }
                    }
                ],
                "transition": "ImportParticipants"
            },
            {
                "name": "ImportParticipants",
                "type": "foreach",
                "inputCollection": "${.participants}",
                "iterationParam": "participant",
                "actions": [
                    {
                        "functionRef": {
                            "refName": "import-participant-data",
                            "arguments": {
                                "participantDir": "${.participant.path}"
                            }
                        }
                    }
                ],
                "outputCollection": "${.importedParticipants}",
                "transition": "ProcessSessions"
            },
            {
                "name": "ProcessSessions",
                "type": "foreach",
                "inputCollection": "${.importedParticipants}",
                "iterationParam": "participant",
                "actions": [
                    {
                        "functionRef": {
                            "refName": "import-session-data",
                            "arguments": {
                                "participantId": "${.participant.id}",
                                "participantDir": "${.participant.path}"
                            }
                        }
                    }
                ],
                "outputCollection": "${.processedSessions}",
                "transition": "ImportPhysiologicalData"
            },
            {
                "name": "ImportPhysiologicalData",
                "type": "foreach",
                "inputCollection": "${.processedSessions}",
                "iterationParam": "session",
                "actions": [
                    {
                        "functionRef": {
                            "refName": "import-physiological-data",
                            "arguments": {
                                "sessionId": "${.session.id}",
                                "participantId": "${.session.participantId}",
                                "participantDir": "${.session.participantDir}"
                            }
                        }
                    }
                ],
                "transition": "ImportVideoData"
            },
            {
                "name": "ImportVideoData",
                "type": "foreach",
                "inputCollection": "${.processedSessions}",
                "iterationParam": "session",
                "actions": [
                    {
                        "functionRef": {
                            "refName": "import-video-data",
                            "arguments": {
                                "sessionId": "${.session.id}",
                                "participantId": "${.session.participantId}",
                                "participantDir": "${.session.participantDir}"
                            }
                        }
                    }
                ],
                "transition": "ImportHumeAnalysis"
            },
            {
                "name": "ImportHumeAnalysis",
                "type": "foreach",
                "inputCollection": "${.processedSessions}",
                "iterationParam": "session",
                "actions": [
                    {
                        "functionRef": {
                            "refName": "import-hume-analysis",
                            "arguments": {
                                "sessionId": "${.session.id}",
                                "participantId": "${.session.participantId}",
                                "participantDir": "${.session.participantDir}"
                            }
                        }
                    }
                ],
                "transition": "CompleteImport"
            },
            {
                "name": "CompleteImport",
                "type": "operation",
                "actions": [
                    {
                        "functionRef": {
                            "refName": "finalize-import",
                            "arguments": {
                                "importedParticipants": "${.importedParticipants}",
                                "processedSessions": "${.processedSessions}"
                            }
                        }
                    }
                ],
                "end": True
            }
        ],
        "functions": [
            {
                "name": "scan-participants-directory",
                "type": "rest",
                "uri": "http://data-ingestion:8001/api/import/scan-participants"
            },
            {
                "name": "import-participant-data",
                "type": "rest",
                "uri": "http://data-ingestion:8001/api/import/participant"
            },
            {
                "name": "import-session-data",
                "type": "rest",
                "uri": "http://data-ingestion:8001/api/import/session"
            },
            {
                "name": "import-physiological-data",
                "type": "rest",
                "uri": "http://data-ingestion:8001/api/import/physiological"
            },
            {
                "name": "import-video-data",
                "type": "rest",
                "uri": "http://data-ingestion:8001/api/import/video"
            },
            {
                "name": "import-hume-analysis",
                "type": "rest",
                "uri": "http://analysis-engine:8002/api/import/hume-analysis"
            },
            {
                "name": "finalize-import",
                "type": "rest",
                "uri": "http://data-ingestion:8001/api/import/finalize"
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
        ),
        WorkflowDefinition(
            id="participants-import",
            name="Participants Data Import",
            description="Import participant data from dataset directory",
            version="1.0",
            definition=create_participants_import_workflow(),
            created_at=now_utc(),
            updated_at=now_utc()
        )
    ]
