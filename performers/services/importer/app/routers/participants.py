"""
Participants import router using Temporal
Merkle DAG: import.service.import.participants
"""
import logging
import os
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel

from app.workflows import ImportParticipantsWorkflow

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
    """Start Temporal workflow to import participants from dataset directory"""
    dataset_path = import_req.dataset_path if import_req and import_req.dataset_path else os.getenv("DATASET_PATH", "/app/dataset/participants")
    
    temporal_client = request.app.state.temporal_client
    if not temporal_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Temporal client not initialized"
        )
    
    workflow_id = f"import-participants-{uuid.uuid4()}"
    
    try:
        await temporal_client.start_workflow(
            ImportParticipantsWorkflow.run,
            dataset_path,
            id=workflow_id,
            task_queue="import-task-queue",
        )
        
        return ImportResponse(
            success=True,
            message=f"Import workflow started",
            workflow_id=workflow_id
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
    temporal_client = request.app.state.temporal_client
    if not temporal_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Temporal client not initialized"
        )
    
    try:
        handle = temporal_client.get_workflow_handle(workflow_id)
        desc = await handle.describe()
        
        result = None
        if desc.status == 2: # Completed
            result = await handle.result()
            
        return {
            "workflow_id": workflow_id,
            "status": desc.status.name,
            "result": result
        }
    except Exception as e:
        logger.error(f"Failed to get workflow status: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow not found or error: {str(e)}"
        )
