#!/usr/bin/env python3
"""
Storage Adapter Service for Spirit in Physics Pipeline.

This service provides data access layer for Neo4j database operations.
"""

import asyncio
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Add project root to path
sys.path.append('/app')

from libs.shared.config import config
from libs.shared.utils import setup_logging, ServiceError
from libs.models.schemas import (
    ParticipantResponse,
    SessionResponse,
    AnalysisResultResponse,
    HumeAnalysisResponse,
    PhysiologicalDataResponse,
    JobResponse,
    WorkflowExecutionResponse
)

# Import data access components
from libs.storage.neo4j_client import Neo4jClient
from libs.data.data_loader import DataLoader
from libs.data.data_storer import DataStorer


logger = setup_logging("storage-adapter")

# Initialize data access components
neo4j_client = Neo4jClient()
data_loader = DataLoader()
data_storer = DataStorer()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting Storage Adapter Service")
    await neo4j_client.connect()
    yield
    logger.info("Shutting down Storage Adapter Service")
    await neo4j_client.disconnect()


app = FastAPI(
    title="Storage Adapter Service",
    description="Data access layer for Spirit in Physics storage operations",
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
    try:
        # Test database connection
        await neo4j_client.test_connection()
        return {"status": "healthy", "service": "storage-adapter", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "service": "storage-adapter", "database": "disconnected", "error": str(e)}


@app.get("/api/participants", response_model=list[ParticipantResponse])
async def get_participants():
    """Get all participants."""
    try:
        participants = await data_loader.load_participants()
        return [
            ParticipantResponse(
                id=p.id,
                name=p.name,
                email=p.email,
                created_at=p.created_at,
                consent_given=p.consent_given,
                session_count=p.session_count
            )
            for p in participants
        ]
    except Exception as e:
        logger.error(f"Failed to get participants: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/participants/{participant_id}", response_model=ParticipantResponse)
async def get_participant(participant_id: str):
    """Get participant by ID."""
    try:
        participant = await data_loader.load_participant(participant_id)
        if not participant:
            raise HTTPException(status_code=404, detail=f"Participant {participant_id} not found")

        return ParticipantResponse(
            id=participant.id,
            name=participant.name,
            email=participant.email,
            created_at=participant.created_at,
            consent_given=participant.consent_given,
            session_count=participant.session_count
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get participant {participant_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sessions/load")
async def load_session_data(participant_id: str = None, session_id: str = None):
    """Load session data for analysis."""
    try:
        if session_id:
            # Load specific session
            session_data = await data_loader.load_session(session_id)
            if not session_data:
                raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
            return session_data
        elif participant_id:
            # Load all sessions for participant
            sessions = await data_loader.load_participant_sessions(participant_id)
            return {"sessions": sessions}
        else:
            raise HTTPException(status_code=400, detail="Either participant_id or session_id must be provided")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to load session data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analysis/results", response_model=list[AnalysisResultResponse])
async def get_analysis_results(participant_id: str = None, limit: int = 50):
    """Get analysis results."""
    try:
        results = await data_loader.load_analysis_results(participant_id=participant_id, limit=limit)
        return [
            AnalysisResultResponse(
                id=r.id,
                session_id=r.session_id,
                participant_id=r.participant_id,
                model_version=r.model_version,
                spirit_probability=r.spirit_probability,
                components=r.components,
                created_at=r.created_at,
                metadata=r.metadata
            )
            for r in results
        ]
    except Exception as e:
        logger.error(f"Failed to get analysis results: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analysis/results/{result_id}", response_model=AnalysisResultResponse)
async def get_analysis_result(result_id: str):
    """Get analysis result by ID."""
    try:
        result = await data_loader.load_analysis_result(result_id)
        if not result:
            raise HTTPException(status_code=404, detail=f"Analysis result {result_id} not found")

        return AnalysisResultResponse(
            id=result.id,
            session_id=result.session_id,
            participant_id=result.participant_id,
            model_version=result.model_version,
            spirit_probability=result.spirit_probability,
            components=result.components,
            created_at=result.created_at,
            metadata=result.metadata
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get analysis result {result_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/hume/analysis/{session_id}", response_model=HumeAnalysisResponse)
async def get_hume_analysis(session_id: str):
    """Get Hume AI analysis for session."""
    try:
        hume_data = await data_loader.load_hume_analysis(session_id)
        if not hume_data:
            raise HTTPException(status_code=404, detail=f"Hume analysis for session {session_id} not found")

        return HumeAnalysisResponse(
            id=hume_data.id,
            session_id=hume_data.session_id,
            participant_id=hume_data.participant_id,
            emotions=hume_data.emotions,
            prosody=hume_data.prosody,
            language=hume_data.language,
            created_at=hume_data.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get Hume analysis for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/physiological/{session_id}")
async def get_physiological_data(session_id: str):
    """Get physiological data for session."""
    try:
        physio_data = await data_loader.load_physiological_data(session_id)
        if not physio_data:
            return {"data": []}

        return {
            "data": [
                {
                    "id": p.id,
                    "timestamp": p.timestamp,
                    "skin_conductance": p.skin_conductance,
                    "heart_rate": p.heart_rate,
                    "metadata": p.metadata
                }
                for p in physio_data
            ]
        }
    except Exception as e:
        logger.error(f"Failed to get physiological data for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/results/store")
async def store_analysis_result(result_data: dict):
    """Store analysis result."""
    try:
        # Use existing data storer
        result_id = await data_storer.store_analysis_result(result_data)
        logger.info(f"Analysis result stored: {result_id}")
        return {"result_id": result_id, "status": "stored"}
    except Exception as e:
        logger.error(f"Failed to store analysis result: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/jobs", response_model=list[JobResponse])
async def get_jobs(status: str = None, limit: int = 50):
    """Get jobs with optional status filter."""
    try:
        jobs = await data_loader.load_jobs(status=status, limit=limit)
        return [
            JobResponse(
                id=j.id,
                type=j.type,
                status=j.status,
                created_at=j.created_at,
                updated_at=j.updated_at,
                data=j.data,
                result=j.result,
                error=j.error
            )
            for j in jobs
        ]
    except Exception as e:
        logger.error(f"Failed to get jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/workflow/executions", response_model=list[WorkflowExecutionResponse])
async def get_workflow_executions(limit: int = 20):
    """Get recent workflow executions."""
    try:
        executions = await data_loader.load_workflow_executions(limit=limit)
        return [
            WorkflowExecutionResponse(
                id=e.id,
                workflow_id=e.workflow_id,
                status=e.status,
                started_at=e.started_at,
                completed_at=e.completed_at,
                data=e.data,
                result=e.result,
                error=e.error
            )
            for e in executions
        ]
    except Exception as e:
        logger.error(f"Failed to get workflow executions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    service_config = config.services["storage_adapter"]

    uvicorn.run(
        "main:app",
        host=service_config.host,
        port=service_config.port,
        reload=service_config.debug,
        log_level="info"
    )
