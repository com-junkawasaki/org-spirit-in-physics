#!/usr/bin/env python3
"""
API Gateway Service for Spirit in Physics Pipeline.

This service acts as the main entry point for the pipeline,
routing requests to appropriate microservices and aggregating responses.
"""

import asyncio
import json
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx

# Add project root to path
sys.path.append('/app')

from libs.shared.config import config
from libs.shared.utils import setup_logging, ServiceError


logger = setup_logging("api-gateway")

# Service endpoints mapping
SERVICE_ENDPOINTS = {
    "data-ingestion": "http://data-ingestion:8001",
    "analysis-engine": "http://analysis-engine:8002",
    "workflow-orchestrator": "http://workflow-orchestrator:8003",
    "storage-adapter": "http://storage-adapter:8004",
}

# Initialize HTTP client for service communication
http_client = httpx.AsyncClient(timeout=30.0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting API Gateway Service")
    yield
    logger.info("Shutting down API Gateway Service")
    await http_client.aclose()


app = FastAPI(
    title="Spirit in Physics Pipeline API",
    description="Unified API gateway for Spirit in Physics microservices",
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
    return {"status": "healthy", "service": "api-gateway"}


@app.get("/api/health/services")
async def services_health_check():
    """Check health of all services."""
    health_status = {}

    for service_name, service_url in SERVICE_ENDPOINTS.items():
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{service_url}/health")
                health_status[service_name] = {
                    "status": "healthy" if response.status_code == 200 else "unhealthy",
                    "response_time": response.elapsed.total_seconds()
                }
        except Exception as e:
            health_status[service_name] = {
                "status": "unreachable",
                "error": str(e)
            }

    return {"services": health_status}


@app.api_route("/api/{service}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_request(service: str, path: str, request: Request):
    """Proxy requests to appropriate microservices."""
    try:
        # Validate service
        if service not in SERVICE_ENDPOINTS:
            raise HTTPException(status_code=404, detail=f"Service '{service}' not found")

        service_url = SERVICE_ENDPOINTS[service]
        target_url = f"{service_url}/api/{path}"

        # Get request body
        body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            body = await request.body()

        # Prepare headers
        headers = dict(request.headers)
        # Remove host header to avoid conflicts
        headers.pop("host", None)

        logger.info(f"Proxying {request.method} {request.url.path} -> {target_url}")

        # Make request to target service
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body,
                params=request.query_params
            )

            # Return response
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers)
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to proxy request to {service}: {e}")
        raise HTTPException(status_code=500, detail=f"Service communication error: {str(e)}")


@app.get("/api/dashboard")
async def get_dashboard_data():
    """Get aggregated dashboard data from all services."""
    try:
        dashboard_data = {
            "workflows": [],
            "executions": [],
            "jobs": [],
            "system_health": {}
        }

        # Get workflow definitions
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get("http://workflow-orchestrator:8003/api/workflows")
                if response.status_code == 200:
                    dashboard_data["workflows"] = response.json()
        except Exception as e:
            logger.warning(f"Failed to get workflows: {e}")

        # Get recent executions
        try:
            # This would need a proper endpoint in workflow-orchestrator
            dashboard_data["executions"] = []
        except Exception as e:
            logger.warning(f"Failed to get executions: {e}")

        # Get system health
        try:
            health_response = await services_health_check()
            dashboard_data["system_health"] = health_response["services"]
        except Exception as e:
            logger.warning(f"Failed to get system health: {e}")

        return dashboard_data

    except Exception as e:
        logger.error(f"Failed to get dashboard data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/workflows/start-analysis")
async def start_analysis_workflow(request: Request):
    """Start analysis workflow (legacy endpoint for compatibility)."""
    try:
        # Get request data
        data = await request.json()

        # Forward to workflow orchestrator
        workflow_request = {
            "workflow_id": "unified-pipeline",
            "data": {
                "participantId": data.get("participantId", "unknown"),
                "sessionIds": data.get("sessionIds", []),
                "modelVersion": data.get("modelVersion", "1.0"),
                "experimentType": data.get("experimentType", "physiological"),
                "notes": data.get("notes", "")
            }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://workflow-orchestrator:8003/api/workflows/unified-pipeline/execute",
                json=workflow_request
            )

            if response.status_code == 200:
                result = response.json()
                return {
                    "workflow_id": result["id"],
                    "status": "started",
                    "message": "ワークフローが開始されました"
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Workflow execution failed: {response.text}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start analysis workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/workflows")
async def get_workflows():
    """Get all available workflows."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://workflow-orchestrator:8003/api/workflows")

            if response.status_code == 200:
                workflows = response.json()
                return workflows
            else:
                logger.error(f"Failed to get workflows from orchestrator: {response.status_code}")
                raise HTTPException(status_code=response.status_code, detail="Failed to get workflows")

    except Exception as e:
        logger.error(f"Failed to get workflows: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/workflows/start-participants-import")
async def start_participants_import_workflow():
    """Start participants data import workflow."""
    try:
        # Start participants import workflow
        workflow_request = {
            "workflow_id": "participants-import",
            "data": {}
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://workflow-orchestrator:8003/api/workflows/participants-import/execute",
                json=workflow_request
            )

            if response.status_code == 200:
                result = response.json()
                return {
                    "workflow_id": result["id"],
                    "status": "started",
                    "message": "参加者データインポートワークフローが開始されました",
                    "workflow_type": "participants-import"
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Participants import workflow execution failed: {response.text}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start participants import workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/import/participants/status")
async def get_participants_import_status():
    """Get participants import status."""
    try:
        # Check if there's an active participants import workflow
        async with httpx.AsyncClient() as client:
            # Get recent workflow executions
            response = await client.get("http://workflow-orchestrator:8003/api/workflow/executions?limit=10")

            if response.status_code == 200:
                executions = response.json()
                # Find participants-import workflow
                import_executions = [
                    exec for exec in executions
                    if exec.get("workflow_id") == "participants-import"
                ]

                if import_executions:
                    latest = import_executions[0]
                    return {
                        "workflow_id": latest["id"],
                        "status": latest["status"],
                        "started_at": latest["started_at"],
                        "completed_at": latest.get("completed_at"),
                        "result": latest.get("result")
                    }
                else:
                    return {"status": "no_active_import"}

            else:
                return {"status": "unknown"}

    except Exception as e:
        logger.error(f"Failed to get participants import status: {e}")
        return {"status": "error", "error": str(e)}


@app.get("/api/analysis/runs")
async def get_analysis_runs():
    """Get analysis runs (legacy endpoint for compatibility)."""
    try:
        # This would aggregate data from workflow orchestrator and storage adapter
        # For now, return mock data
        return [
            {
                "_key": "run-001",
                "participant_id": "participant-001",
                "status": "completed",
                "progress": 100,
                "created_at": "2025-10-15T12:00:00Z",
                "result": {
                    "spirit_probability": 0.85,
                    "components": {
                        "word2vec": 0.3,
                        "reaction_time": 0.25,
                        "emotion": 0.2,
                        "physiological": 0.1
                    }
                }
            }
        ]
    except Exception as e:
        logger.error(f"Failed to get analysis runs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    service_config = config.services["api_gateway"]

    uvicorn.run(
        "services.api_gateway.main:app",
        host=service_config.host,
        port=service_config.port,
        reload=service_config.debug,
        log_level="info"
    )
