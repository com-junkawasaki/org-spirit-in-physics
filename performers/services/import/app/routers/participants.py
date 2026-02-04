"""
Participants import router using Dapr
Merkle DAG: import.service.import.participants
"""
import logging
import os
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel
from dapr.ext.workflow import DaprWorkflowClient

logger = logging.getLogger(__name__)

router = APIRouter()


class ImportRequest(BaseModel):
    dataset_path: Optional[str] = None


class ImportResponse(BaseModel):
    success: bool
    message: str
    workflow_id: str


@router.post("/participants", response_model=ImportResponse)
async def import_participants(request: Request, import_req: Optional[ImportRequest] = None):
    """Start Dapr workflow to import participants from dataset directory"""
    dataset_path = import_req.dataset_path if import_req and import_req.dataset_path else os.getenv("DATASET_PATH", "/app/dataset/participants")

    workflow_id = f"import-participants-{uuid.uuid4()}"

    try:
        with DaprWorkflowClient() as wf_client:
            instance_id = wf_client.schedule_new_workflow(
                workflow="import_participants_workflow",
                input=dataset_path,
                instance_id=workflow_id
            )

            return ImportResponse(
                success=True,
                message=f"Import workflow started",
                workflow_id=instance_id
            )
    except Exception as e:
        logger.error(f"Failed to start import workflow: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start workflow: {str(e)}"
        )


@router.get("/participants/status/{workflow_id}")
async def get_import_status(request: Request, workflow_id: str):
    """Get status of a participant import workflow"""
    try:
        with DaprWorkflowClient() as wf_client:
            state = wf_client.get_workflow_state(instance_id=workflow_id)

            if state is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Workflow not found: {workflow_id}"
                )

            result = None
            if state.runtime_status.name == "COMPLETED":
                result = state.serialized_output

            return {
                "workflow_id": workflow_id,
                "status": state.runtime_status.name,
                "result": result
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get workflow status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting workflow status: {str(e)}"
        )
