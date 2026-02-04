"""
Sessions import router using Temporal
Merkle DAG: import.service.import.sessions
"""
import logging
import os
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel

from app.workflows import ImportSessionsWorkflow

logger = logging.getLogger(__name__)

router = APIRouter()


class ImportRequest(BaseModel):
    dataset_path: Optional[str] = None


class ImportResponse(BaseModel):
    success: bool
    message: str
    workflow_id: str


@router.post("/sessions", response_model=ImportResponse)
async def import_sessions(request: Request, import_req: Optional[ImportRequest] = None):
    """Start Temporal workflow to import sessions from dataset directory"""
    dataset_path = import_req.dataset_path if import_req and import_req.dataset_path else os.getenv("DATASET_PATH", "/app/dataset/participants")
    
    temporal_client = request.app.state.temporal_client
    if not temporal_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Temporal client not initialized"
        )
    
    workflow_id = f"import-sessions-{uuid.uuid4()}"
    
    try:
        await temporal_client.start_workflow(
            ImportSessionsWorkflow.run,
            dataset_path,
            id=workflow_id,
            task_queue="import-task-queue",
        )
        
        return ImportResponse(
            success=True,
            message=f"Import sessions workflow started",
            workflow_id=workflow_id
        )
    except Exception as e:
        logger.error(f"Failed to start import sessions workflow: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start workflow: {str(e)}"
        )
