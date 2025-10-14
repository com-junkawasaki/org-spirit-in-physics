"""
Serverless Workflow Definitions for Spirit in Physics Pipeline

This module defines workflows using Python classes from the Serverless Workflow SDK,
providing programmatic workflow definitions instead of YAML-based ones.
"""

from serverlessworkflow.sdk.workflow import Workflow
from serverlessworkflow.sdk.states import OperationState, ForeachState
from serverlessworkflow.sdk.actions import Action, FunctionRef
from serverlessworkflow.sdk.functions import Function

# Merkle DAG: workflow_definitions -> unified_pipeline
def create_unified_pipeline_workflow() -> Workflow:
    """
    Create the unified pipeline workflow definition.

    This workflow handles the complete pipeline for Spirit in Physics
    data processing and analysis.
    """
    return Workflow(
        id="unified-pipeline-workflow",
        name="Unified Pipeline Workflow",
        description="Complete pipeline for Spirit in Physics data processing and analysis",
        version="1.0",
        specVersion="0.8",
        start="DataIngestion",
        states=[
            OperationState(
                name="DataIngestion",
                type="operation",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="ingestSessionData",
                            arguments={
                                "session_ids": "${ .session_ids }"
                            }
                        )
                    )
                ],
                transition="AnalysisProcessing"
            ),
            OperationState(
                name="AnalysisProcessing",
                type="operation",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="processHumeAnalysis",
                            arguments={
                                "session_ids": "${ .session_ids }"
                            }
                        )
                    ),
                    Action(
                        functionRef=FunctionRef(
                            refName="extractFeatures",
                            arguments={
                                "session_ids": "${ .session_ids }"
                            }
                        )
                    ),
                    Action(
                        functionRef=FunctionRef(
                            refName="calculateSpiritProbability",
                            arguments={
                                "session_ids": "${ .session_ids }",
                                "model_version": "${ .model_version }"
                            }
                        )
                    )
                ],
                transition="StoreResults"
            ),
            OperationState(
                name="StoreResults",
                type="operation",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="storeAnalysisResults",
                            arguments={
                                "run_id": "${ .run_id }",
                                "results": "${ .analysis_results }"
                            }
                        )
                    )
                ],
                end=True
            )
        ],
        functions=[
            Function(
                name="ingestSessionData",
                operation="spirit_in_physics_pipeline.activities::Neo4jActivities.store_raw_hume_data"
            ),
            Function(
                name="processHumeAnalysis",
                operation="spirit_in_physics_pipeline.activities::HumeActivities.process_hume_analysis"
            ),
            Function(
                name="extractFeatures",
                operation="spirit_in_physics_pipeline.activities::AnalysisActivities.extract_features"
            ),
            Function(
                name="calculateSpiritProbability",
                operation="spirit_in_physics_pipeline.activities::AnalysisActivities.calculate_spirit_probability"
            ),
            Function(
                name="storeAnalysisResults",
                operation="spirit_in_physics_pipeline.activities::Neo4jActivities.store_analysis_results"
            )
        ]
    )

# Merkle DAG: workflow_definitions -> physiological_workflow
def create_physiological_workflow() -> Workflow:
    """
    Create the physiological experiment workflow definition.

    This workflow is specialized for physiological experiments with
    enhanced sensor data processing.
    """
    return Workflow(
        id="physiological-workflow",
        name="Physiological Experiment Workflow",
        description="Specialized workflow for physiological experiments with enhanced sensor data processing",
        version="1.0",
        specVersion="0.8",
        start="PhysiologicalDataIngestion",
        states=[
            OperationState(
                name="PhysiologicalDataIngestion",
                type="operation",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="ingestPhysiologicalData",
                            arguments={
                                "session_ids": "${ .session_ids }"
                            }
                        )
                    )
                ],
                transition="HumeAIAnalysis"
            ),
            OperationState(
                name="HumeAIAnalysis",
                type="operation",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="processHumeAIPhysiological",
                            arguments={
                                "session_ids": "${ .session_ids }",
                                "config": "${ .config }"
                            }
                        )
                    )
                ],
                transition="PhysiologicalFeatureExtraction"
            ),
            OperationState(
                name="PhysiologicalFeatureExtraction",
                type="operation",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="extractPhysiologicalFeatures",
                            arguments={
                                "session_ids": "${ .session_ids }",
                                "config": "${ .config }"
                            }
                        )
                    )
                ],
                transition="SpiritProbabilityCalculation"
            ),
            OperationState(
                name="SpiritProbabilityCalculation",
                type="operation",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="calculatePhysiologicalSpiritProbability",
                            arguments={
                                "features": "${ .features }",
                                "config": "${ .config }",
                                "model_version": "${ .model_version }"
                            }
                        )
                    )
                ],
                transition="StorePhysiologicalResults"
            ),
            OperationState(
                name="StorePhysiologicalResults",
                type="operation",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="storePhysiologicalAnalysisResults",
                            arguments={
                                "run_id": "${ .run_id }",
                                "results": "${ .analysis_results }",
                                "experiment_type": "physiological"
                            }
                        )
                    )
                ],
                end=True
            )
        ],
        functions=[
            Function(
                name="ingestPhysiologicalData",
                operation="spirit_in_physics_pipeline.activities::Neo4jActivities.store_raw_hume_data"
            ),
            Function(
                name="processHumeAIPhysiological",
                operation="spirit_in_physics_pipeline.activities::HumeActivities.process_hume_analysis"
            ),
            Function(
                name="extractPhysiologicalFeatures",
                operation="spirit_in_physics_pipeline.activities::AnalysisActivities.extract_physiological_features"
            ),
            Function(
                name="calculatePhysiologicalSpiritProbability",
                operation="spirit_in_physics_pipeline.activities::AnalysisActivities.calculate_physiological_spirit_probability"
            ),
            Function(
                name="storePhysiologicalAnalysisResults",
                operation="spirit_in_physics_pipeline.activities::Neo4jActivities.store_analysis_results"
            )
        ]
    )

# Merkle DAG: workflow_definitions -> online_workflow
def create_online_workflow() -> Workflow:
    """
    Create the online experiment workflow definition.

    This workflow is optimized for online experiments focusing on
    behavioral and linguistic analysis.
    """
    return Workflow(
        id="online-workflow",
        name="Online Experiment Workflow",
        description="Workflow optimized for online experiments focusing on behavioral and linguistic analysis",
        version="1.0",
        specVersion="0.8",
        start="OnlineDataIngestion",
        states=[
            OperationState(
                name="OnlineDataIngestion",
                type="operation",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="ingestOnlineData",
                            arguments={
                                "session_ids": "${ .session_ids }"
                            }
                        )
                    )
                ],
                transition="HumeAIAnalysisOnline"
            ),
            OperationState(
                name="HumeAIAnalysisOnline",
                type="operation",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="processHumeAIOnline",
                            arguments={
                                "session_ids": "${ .session_ids }",
                                "config": "${ .config }"
                            }
                        )
                    )
                ],
                transition="BehavioralFeatureExtraction"
            ),
            OperationState(
                name="BehavioralFeatureExtraction",
                type="operation",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="extractBehavioralFeatures",
                            arguments={
                                "session_ids": "${ .session_ids }",
                                "config": "${ .config }"
                            }
                        )
                    )
                ],
                transition="OnlineSpiritProbabilityCalculation"
            ),
            OperationState(
                name="OnlineSpiritProbabilityCalculation",
                type="operation",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="calculateOnlineSpiritProbability",
                            arguments={
                                "features": "${ .features }",
                                "config": "${ .config }",
                                "model_version": "${ .model_version }"
                            }
                        )
                    )
                ],
                transition="StoreOnlineResults"
            ),
            OperationState(
                name="StoreOnlineResults",
                type="operation",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="storeOnlineAnalysisResults",
                            arguments={
                                "run_id": "${ .run_id }",
                                "results": "${ .analysis_results }",
                                "experiment_type": "online"
                            }
                        )
                    )
                ],
                end=True
            )
        ],
        functions=[
            Function(
                name="ingestOnlineData",
                operation="spirit_in_physics_pipeline.activities::Neo4jActivities.store_raw_hume_data"
            ),
            Function(
                name="processHumeAIOnline",
                operation="spirit_in_physics_pipeline.activities::HumeActivities.process_hume_analysis"
            ),
            Function(
                name="extractBehavioralFeatures",
                operation="spirit_in_physics_pipeline.activities::AnalysisActivities.extract_behavioral_features"
            ),
            Function(
                name="calculateOnlineSpiritProbability",
                operation="spirit_in_physics_pipeline.activities::AnalysisActivities.calculate_online_spirit_probability"
            ),
            Function(
                name="storeOnlineAnalysisResults",
                operation="spirit_in_physics_pipeline.activities::Neo4jActivities.store_analysis_results"
            )
        ]
    )

# Merkle DAG: workflow_definitions -> data_import_workflow
def create_data_import_workflow() -> Workflow:
    """
    Create the data import workflow definition.

    This workflow handles importing participant data from external sources.
    """
    return Workflow(
        id="data-import-workflow",
        name="Data Import Workflow",
        description="Workflow for importing participant data from external sources",
        version="1.0",
        specVersion="0.8",
        start="FetchParticipantData",
        states=[
            OperationState(
                name="FetchParticipantData",
                type="operation",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="fetchExternalData",
                            arguments={
                                "participant_ids": "${ .participant_ids }",
                                "config": "${ .config }"
                            }
                        )
                    )
                ],
                transition="ProcessParticipants"
            ),
            ForeachState(
                name="ProcessParticipants",
                type="foreach",
                inputCollection="${ .participant_ids }",
                iterationParam="participant_id",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="processParticipantData",
                            arguments={
                                "participant_id": "${ $foreach.participant_id }",
                                "config": "${ .config }"
                            }
                        )
                    )
                ],
                transition="UpdateImportStatus"
            ),
            OperationState(
                name="UpdateImportStatus",
                type="operation",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="updateImportStatus",
                            arguments={
                                "import_results": "${ .import_results }",
                                "config": "${ .config }"
                            }
                        )
                    )
                ],
                end=True
            )
        ],
        functions=[
            Function(
                name="fetchExternalData",
                operation="spirit_in_physics_pipeline.activities::ImportStatusActivities.fetch_external_data"
            ),
            Function(
                name="processParticipantData",
                operation="spirit_in_physics_pipeline.activities::ImportStatusActivities.process_participant_data"
            ),
            Function(
                name="updateImportStatus",
                operation="spirit_in_physics_pipeline.activities::ImportStatusActivities.update_import_status"
            )
        ]
    )

# Merkle DAG: workflow_definitions -> ingestion_workflow
def create_ingestion_workflow() -> Workflow:
    """
    Create the data ingestion workflow definition.

    This is a basic workflow for ingesting session data into the system.
    """
    return Workflow(
        id="ingestion-workflow",
        name="Data Ingestion Workflow",
        description="Basic workflow for ingesting session data into the system",
        version="1.0",
        specVersion="0.8",
        start="ValidateSessionData",
        states=[
            OperationState(
                name="ValidateSessionData",
                type="operation",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="validateSessionData",
                            arguments={
                                "session_id": "${ .session_id }"
                            }
                        )
                    )
                ],
                transition="StoreRawData"
            ),
            OperationState(
                name="StoreRawData",
                type="operation",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="storeRawSessionData",
                            arguments={
                                "session_id": "${ .session_id }",
                                "data": "${ .data }"
                            }
                        )
                    )
                ],
                transition="UpdateIngestionStatus"
            ),
            OperationState(
                name="UpdateIngestionStatus",
                type="operation",
                actions=[
                    Action(
                        functionRef=FunctionRef(
                            refName="updateIngestionStatus",
                            arguments={
                                "session_id": "${ .session_id }",
                                "status": "completed"
                            }
                        )
                    )
                ],
                end=True
            )
        ],
        functions=[
            Function(
                name="validateSessionData",
                operation="spirit_in_physics_pipeline.activities::ValidationActivities.validate_session_data"
            ),
            Function(
                name="storeRawSessionData",
                operation="spirit_in_physics_pipeline.activities::Neo4jActivities.store_raw_session_data"
            ),
            Function(
                name="updateIngestionStatus",
                operation="spirit_in_physics_pipeline.activities::Neo4jActivities.update_session_status"
            )
        ]
    )

# Workflow factory functions
# Merkle DAG: workflow_factory -> workflow_definitions
def get_all_workflows():
    """
    Get all available workflow definitions.

    Returns:
        Dictionary mapping workflow IDs to Workflow objects
    """
    return {
        "unified-pipeline-workflow": create_unified_pipeline_workflow(),
        "physiological-workflow": create_physiological_workflow(),
        "online-workflow": create_online_workflow(),
        "data-import-workflow": create_data_import_workflow(),
        "ingestion-workflow": create_ingestion_workflow(),
    }

def get_workflow_by_id(workflow_id: str) -> Workflow:
    """
    Get a specific workflow by ID.

    Args:
        workflow_id: The workflow identifier

    Returns:
        Workflow object

    Raises:
        KeyError: If workflow not found
    """
    workflows = get_all_workflows()
    if workflow_id not in workflows:
        available = list(workflows.keys())
        raise KeyError(f"Workflow '{workflow_id}' not found. Available: {available}")
    return workflows[workflow_id]
