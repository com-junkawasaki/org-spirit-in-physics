#!/usr/bin/env python3
"""
Data Ingestion Service for Spirit in Physics Pipeline.

This service handles data ingestion and preprocessing for the pipeline.
"""

import asyncio
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

# Add project root to path
sys.path.append('/app')

from libs.shared.config import config
from libs.shared.utils import setup_logging, ServiceError
from libs.shared.models import Participant, ExperimentSession, PhysiologicalData
from libs.models.schemas import (
    ParticipantCreateRequest,
    ParticipantResponse,
    SessionCreateRequest,
    SessionResponse,
    PhysiologicalDataRequest,
    PhysiologicalDataResponse
)

# Import data processing modules
from packages.spirit_in_physics_pipeline.data_loader import DataLoader
from packages.spirit_in_physics_pipeline.data_storer import DataStorer
from packages.spirit_in_physics_pipeline.session_data_processor import SessionDataProcessor


logger = setup_logging("data-ingestion")

# Initialize data components
data_loader = DataLoader()
data_storer = DataStorer()
session_processor = SessionDataProcessor()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting Data Ingestion Service")
    yield
    logger.info("Shutting down Data Ingestion Service")


app = FastAPI(
    title="Data Ingestion Service",
    description="Data ingestion and preprocessing service for Spirit in Physics",
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
    return {"status": "healthy", "service": "data-ingestion"}


@app.post("/api/ingest/participant", response_model=ParticipantResponse)
async def ingest_participant(request: ParticipantCreateRequest):
    """Ingest participant data."""
    try:
        # Create participant object
        participant = Participant(
            id=request.id,
            name=request.name,
            email=request.email
        )

        # Store participant data
        result = data_storer.store_participant(participant)

        logger.info(f"Participant ingested: {participant.id}")

        return ParticipantResponse(
            id=participant.id,
            name=participant.name,
            email=participant.email,
            created_at=result.get('created_at'),
            consent_given=False,
            session_count=0
        )
    except Exception as e:
        logger.error(f"Failed to ingest participant: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ingest/session", response_model=SessionResponse)
async def ingest_session(request: SessionCreateRequest):
    """Ingest experiment session data."""
    try:
        # Create session object
        session = ExperimentSession(
            id=f"session-{request.participant_id}-{len(request.data)}",
            participant_id=request.participant_id,
            started_at=data_storer.now_utc(),
            data=request.data
        )

        # Store session data
        result = data_storer.store_session(session)

        logger.info(f"Session ingested: {session.id}")

        return SessionResponse(
            id=session.id,
            participant_id=session.participant_id,
            started_at=session.started_at,
            status="active",
            data=session.data
        )
    except Exception as e:
        logger.error(f"Failed to ingest session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ingest/physiological", response_model=PhysiologicalDataResponse)
async def ingest_physiological_data(request: PhysiologicalDataRequest):
    """Ingest physiological data."""
    try:
        # Create physiological data object
        physio_data = PhysiologicalData(
            id=f"physio-{request.session_id}-{request.timestamp.isoformat()}",
            session_id=request.session_id,
            participant_id=request.participant_id,
            timestamp=request.timestamp,
            skin_conductance=request.skin_conductance,
            heart_rate=request.heart_rate,
            metadata=request.metadata or {}
        )

        # Store physiological data
        result = data_storer.store_physiological_data(physio_data)

        logger.info(f"Physiological data ingested: {physio_data.id}")

        return PhysiologicalDataResponse(
            id=physio_data.id,
            session_id=physio_data.session_id,
            participant_id=physio_data.participant_id,
            timestamp=physio_data.timestamp,
            skin_conductance=physio_data.skin_conductance,
            heart_rate=physio_data.heart_rate,
            metadata=physio_data.metadata
        )
    except Exception as e:
        logger.error(f"Failed to ingest physiological data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ingest/batch")
async def ingest_batch_data(files: List[UploadFile], background_tasks: BackgroundTasks):
    """Batch ingest multiple data files."""
    try:
        results = []

        for file in files:
            # Process file based on type
            if file.filename.endswith('.csv'):
                # Process CSV data
                result = await process_csv_file(file)
                results.append(result)
            elif file.filename.endswith('.json'):
                # Process JSON data
                result = await process_json_file(file)
                results.append(result)

        logger.info(f"Batch ingestion completed: {len(results)} files processed")

        return {"message": f"Processed {len(results)} files", "results": results}
    except Exception as e:
        logger.error(f"Failed to process batch data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def process_csv_file(file: UploadFile) -> dict:
    """Process CSV file for ingestion."""
    try:
        content = await file.read()
        # Process CSV content
        # This would integrate with the existing data processing logic
        return {"filename": file.filename, "status": "processed", "records": 0}
    except Exception as e:
        return {"filename": file.filename, "status": "error", "error": str(e)}


async def process_json_file(file: UploadFile) -> dict:
    """Process JSON file for ingestion."""
    try:
        content = await file.read()
        data = json.loads(content.decode())
        # Process JSON data
        return {"filename": file.filename, "status": "processed", "data": data}
    except Exception as e:
        return {"filename": file.filename, "status": "error", "error": str(e)}


if __name__ == "__main__":
    import uvicorn

    service_config = config.services["data_ingestion"]

    uvicorn.run(
        "main:app",
        host=service_config.host,
        port=service_config.port,
        reload=service_config.debug,
        log_level="info"
    )
