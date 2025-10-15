#!/usr/bin/env python3
"""
Workflow Orchestrator Service for Spirit in Physics Pipeline.

This service manages workflow definitions and orchestrates execution
across multiple microservices using serverless workflow specifications.
"""

import asyncio
import json
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import httpx

# Add project root to path
sys.path.append('/app')

from libs.shared.config import config
from libs.shared.utils import setup_logging, ServiceError
from libs.shared.models import WorkflowExecution, WorkflowStatus
from libs.models.schemas import (
    WorkflowExecutionCreateRequest,
    WorkflowExecutionResponse,
    WorkflowDefinitionResponse
)
from libs.workflows.definitions import get_workflow_definitions


logger = setup_logging("workflow-orchestrator")

# Initialize HTTP client for service communication
http_client = httpx.AsyncClient(timeout=30.0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting Workflow Orchestrator Service")
    yield
    logger.info("Shutting down Workflow Orchestrator Service")
    await http_client.aclose()


app = FastAPI(
    title="Workflow Orchestrator Service",
    description="Workflow orchestration service for Spirit in Physics",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "workflow-orchestrator"}


@app.get("/api/workflows", response_model=list[WorkflowDefinitionResponse])
async def list_workflows():
    """List available workflow definitions."""
    try:
        workflows = get_workflow_definitions()
        return [
            WorkflowDefinitionResponse(
                id=w.id,
                name=w.name,
                description=w.description,
                version=w.version,
                definition=w.definition,
                created_at=w.created_at,
                updated_at=w.updated_at
            )
            for w in workflows
        ]
    except Exception as e:
        logger.error(f"Failed to list workflows: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/workflows/{workflow_id}")
async def get_workflow(workflow_id: str):
    """Get workflow definition by ID."""
    try:
        workflows = get_workflow_definitions()
        workflow = next((w for w in workflows if w.id == workflow_id), None)

        if not workflow:
            raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")

        return WorkflowDefinitionResponse(
            id=workflow.id,
            name=workflow.name,
            description=workflow.description,
            version=workflow.version,
            definition=workflow.definition,
            created_at=workflow.created_at,
            updated_at=workflow.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get workflow {workflow_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/workflows/{workflow_id}/execute", response_model=WorkflowExecutionResponse)
async def execute_workflow(
    workflow_id: str,
    request: WorkflowExecutionCreateRequest,
    background_tasks: BackgroundTasks
):
    """Execute a workflow."""
    try:
        # Validate workflow exists
        workflows = get_workflow_definitions()
        workflow = next((w for w in workflows if w.id == workflow_id), None)

        if not workflow:
            raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")

        # Create workflow execution
        execution = WorkflowExecution(
            id=f"exec-{workflow_id}-{len(request.data)}",
            workflow_id=workflow_id,
            status=WorkflowStatus.CREATED,
            started_at=asyncio.get_event_loop().time(),
            data=request.data
        )

        # Start workflow execution in background
        background_tasks.add_task(execute_workflow_async, execution, workflow.definition)

        logger.info(f"Workflow execution started: {execution.id}")

        return WorkflowExecutionResponse(
            id=execution.id,
            workflow_id=execution.workflow_id,
            status=execution.status,
            started_at=execution.started_at,
            data=execution.data
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to execute workflow {workflow_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/executions/{execution_id}", response_model=WorkflowExecutionResponse)
async def get_execution_status(execution_id: str):
    """Get workflow execution status."""
    try:
        # In a real implementation, this would query a database
        # For now, return mock data
        return WorkflowExecutionResponse(
            id=execution_id,
            workflow_id="mock-workflow",
            status=WorkflowStatus.RUNNING,
            started_at=asyncio.get_event_loop().time(),
            data={}
        )
    except Exception as e:
        logger.error(f"Failed to get execution status {execution_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def execute_workflow_async(execution: WorkflowExecution, workflow_definition: dict):
    """Execute workflow asynchronously."""
    try:
        execution.status = WorkflowStatus.RUNNING
        logger.info(f"Executing workflow: {execution.workflow_id}")

        # Execute workflow states sequentially
        states = workflow_definition.get('states', [])
        results = {}

        for state in states:
            state_name = state.get('name')
            logger.info(f"Executing state: {state_name}")

            # Execute state actions
            actions = state.get('actions', [])
            for action in actions:
                function_ref = action.get('functionRef', {})
                function_name = function_ref.get('refName')

                # Call appropriate service based on function name
                result = await call_service_function(function_name, execution.data)
                results[state_name] = result

                # Update execution data with results
                execution.data.update(result)

        # Mark execution as completed
        execution.status = WorkflowStatus.COMPLETED
        execution.completed_at = asyncio.get_event_loop().time()
        execution.result = results

        logger.info(f"Workflow execution completed: {execution.id}")

    except Exception as e:
        execution.status = WorkflowStatus.FAILED
        execution.error = str(e)
        logger.error(f"Workflow execution failed: {execution.id}, error: {e}")


async def call_service_function(function_name: str, data: dict) -> dict:
    """Call appropriate microservice function."""
    try:
        if function_name == "ingest-participant-data":
            return await call_data_ingestion_service("ingest-participant", data)
        elif function_name == "run-kawasaki-analysis":
            return await call_analysis_service("analyze/kawasaki", data)
        elif function_name == "run-hume-analysis":
            return await call_analysis_service("hume/analyze", data)
        elif function_name == "load-participant-session":
            return await call_storage_service("sessions/load", data)
        elif function_name == "store-analysis-results":
            return await call_storage_service("results/store", data)
        else:
            logger.warning(f"Unknown function: {function_name}")
            return {}

    except Exception as e:
        logger.error(f"Failed to call service function {function_name}: {e}")
        return {"error": str(e)}


async def call_data_ingestion_service(endpoint: str, data: dict) -> dict:
    """Call data ingestion service."""
    url = f"http://data-ingestion:8001/api/{endpoint}"
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=data)
        return response.json()


async def call_analysis_service(endpoint: str, data: dict) -> dict:
    """Call analysis engine service."""
    url = f"http://analysis-engine:8002/api/{endpoint}"
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=data)
        return response.json()


async def call_storage_service(endpoint: str, data: dict) -> dict:
    """Call storage adapter service."""
    url = f"http://storage-adapter:8004/api/{endpoint}"
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=data)
        return response.json()


@app.post("/api/workflows/validate")
async def validate_workflow(workflow_definition: dict):
    """Validate workflow definition."""
    try:
        # Basic validation
        required_fields = ['id', 'name', 'version', 'start', 'states']
        for field in required_fields:
            if field not in workflow_definition:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required field: {field}"
                )

        # Validate states have proper structure
        states = workflow_definition.get('states', [])
        if not states:
            raise HTTPException(status_code=400, detail="Workflow must have at least one state")

        for state in states:
            if 'name' not in state or 'type' not in state:
                raise HTTPException(
                    status_code=400,
                    detail=f"State missing required fields: {state.get('name', 'unknown')}"
                )

        return {"valid": True, "message": "Workflow definition is valid"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to validate workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    service_config = config.services["workflow_orchestrator"]

    uvicorn.run(
        "main:app",
        host=service_config.host,
        port=service_config.port,
        reload=service_config.debug,
        log_level="info"
    )
