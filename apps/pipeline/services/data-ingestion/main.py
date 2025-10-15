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
from libs.data.data_loader import DataLoader
from libs.data.data_storer import DataStorer
from libs.data.session_data_processor import SessionDataProcessor


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


# Participants Import Workflow Endpoints

@app.get("/api/import/scan-participants")
async def scan_participants_directory():
    """Scan participants directory and return list of participant directories."""
    try:
        import os
        from pathlib import Path

        # Dataset directory path
        dataset_path = Path("/app/dataset/participants")

        if not dataset_path.exists():
            raise HTTPException(status_code=404, detail="Participants dataset directory not found")

        participants = []
        for participant_dir in dataset_path.iterdir():
            if participant_dir.is_dir() and not participant_dir.name.startswith('.'):
                # Check if directory contains required files
                consent_file = participant_dir / "consent.json"
                session_file = participant_dir / "session_data.json"

                if consent_file.exists() and session_file.exists():
                    participants.append({
                        "id": participant_dir.name,
                        "path": str(participant_dir),
                        "has_consent": True,
                        "has_session_data": True
                    })
                else:
                    participants.append({
                        "id": participant_dir.name,
                        "path": str(participant_dir),
                        "has_consent": consent_file.exists(),
                        "has_session_data": session_file.exists()
                    })

        logger.info(f"Scanned {len(participants)} participant directories")

        return {"participants": participants, "total": len(participants)}
    except Exception as e:
        logger.error(f"Failed to scan participants directory: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/import/participant")
async def import_participant_data(participant_dir: str):
    """Import participant data from directory."""
    try:
        from pathlib import Path
        import json

        dir_path = Path(participant_dir)
        consent_file = dir_path / "consent.json"

        if not consent_file.exists():
            raise HTTPException(status_code=404, detail=f"Consent file not found: {consent_file}")

        # Read consent data
        with open(consent_file, 'r', encoding='utf-8') as f:
            consent_data = json.load(f)

        # Create participant object
        participant = Participant(
            id=dir_path.name,
            name=consent_data.get('name', f'Participant {dir_path.name}'),
            email=consent_data.get('email'),
            consent_given=consent_data.get('consent_given', False)
        )

        # Store participant data
        result = data_storer.store_participant(participant)

        logger.info(f"Participant imported: {participant.id}")

        return {
            "participant": {
                "id": participant.id,
                "name": participant.name,
                "email": participant.email,
                "path": participant_dir
            },
            "stored_at": result.get('created_at')
        }
    except Exception as e:
        logger.error(f"Failed to import participant data from {participant_dir}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/import/session")
async def import_session_data(participant_id: str, participant_dir: str):
    """Import session data for a participant."""
    try:
        from pathlib import Path
        import json

        dir_path = Path(participant_dir)
        session_file = dir_path / "session_data.json"

        if not session_file.exists():
            raise HTTPException(status_code=404, detail=f"Session file not found: {session_file}")

        # Read session data
        with open(session_file, 'r', encoding='utf-8') as f:
            session_data = json.load(f)

        sessions = []
        for session_info in session_data.get('sessions', []):
            # Create session object
            session = ExperimentSession(
                id=f"session-{participant_id}-{session_info.get('id', '1')}",
                participant_id=participant_id,
                started_at=data_storer.now_utc(),
                data=session_info
            )

            # Store session data
            result = data_storer.store_session(session)
            sessions.append({
                "id": session.id,
                "participant_id": session.participant_id,
                "data": session.data,
                "participant_dir": participant_dir
            })

        logger.info(f"Sessions imported for participant {participant_id}: {len(sessions)} sessions")

        return {"sessions": sessions, "participant_id": participant_id, "participant_dir": participant_dir}
    except Exception as e:
        logger.error(f"Failed to import session data for {participant_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/import/physiological")
async def import_physiological_data(session_id: str, participant_id: str, participant_dir: str):
    """Import physiological data for a session."""
    try:
        from pathlib import Path
        import pandas as pd

        dir_path = Path(participant_dir)

        # Find CSV files (physiological data)
        csv_files = list(dir_path.glob("*.CSV")) + list(dir_path.glob("*.csv"))

        physiological_data = []
        for csv_file in csv_files:
            try:
                # Read CSV data
                df = pd.read_csv(csv_file)

                # Process physiological data (assuming GSR/skin conductance)
                for idx, row in df.iterrows():
                    physio_record = PhysiologicalData(
                        id=f"physio-{session_id}-{idx}",
                        session_id=session_id,
                        participant_id=participant_id,
                        timestamp=data_storer.now_utc(),  # Use current time or parse from data
                        skin_conductance=float(row.get('GSR', row.get('skin_conductance', 0))),
                        heart_rate=float(row.get('HR', row.get('heart_rate', 0))) if 'HR' in row or 'heart_rate' in row else None,
                        metadata={"source_file": str(csv_file), "row_index": idx, "original_data": dict(row)}
                    )

                    # Store physiological data
                    data_storer.store_physiological_data(physio_record)
                    physiological_data.append({
                        "id": physio_record.id,
                        "timestamp": physio_record.timestamp,
                        "skin_conductance": physio_record.skin_conductance,
                        "heart_rate": physio_record.heart_rate
                    })

            except Exception as e:
                logger.warning(f"Failed to process CSV file {csv_file}: {e}")
                continue

        logger.info(f"Physiological data imported for session {session_id}: {len(physiological_data)} records")

        return {
            "session_id": session_id,
            "physiological_data_count": len(physiological_data),
            "csv_files_processed": len(csv_files)
        }
    except Exception as e:
        logger.error(f"Failed to import physiological data for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/import/video")
async def import_video_data(session_id: str, participant_id: str, participant_dir: str):
    """Import video data for a session."""
    try:
        from pathlib import Path

        dir_path = Path(participant_dir)

        # Find video files
        video_files = list(dir_path.glob("*.webm")) + list(dir_path.glob("*.mp4")) + list(dir_path.glob("*.avi"))

        imported_videos = []
        for video_file in video_files:
            try:
                # Extract session number from filename
                filename = video_file.name
                session_num = "1"  # Default
                if "session-" in filename and "-" in filename.split("session-")[1]:
                    session_num = filename.split("session-")[1].split("-")[0]

                # Create video record (metadata only, actual file handling would be more complex)
                video_record = {
                    "id": f"video-{session_id}-{session_num}",
                    "session_id": session_id,
                    "participant_id": participant_id,
                    "filename": filename,
                    "filepath": str(video_file),
                    "file_size": video_file.stat().st_size,
                    "imported_at": data_storer.now_utc().isoformat()
                }

                # Store video metadata (actual file storage would depend on infrastructure)
                # For now, just log the metadata
                logger.info(f"Video file processed: {video_record}")

                imported_videos.append(video_record)

            except Exception as e:
                logger.warning(f"Failed to process video file {video_file}: {e}")
                continue

        logger.info(f"Video data imported for session {session_id}: {len(imported_videos)} files")

        return {
            "session_id": session_id,
            "videos_imported": len(imported_videos),
            "video_files": imported_videos
        }
    except Exception as e:
        logger.error(f"Failed to import video data for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/import/finalize")
async def finalize_import(imported_participants: dict, processed_sessions: dict):
    """Finalize the import process."""
    try:
        # Generate import summary
        summary = {
            "total_participants": len(imported_participants.get("participants", [])),
            "total_sessions": len(processed_sessions.get("sessions", [])),
            "imported_at": data_storer.now_utc().isoformat(),
            "status": "completed"
        }

        # Store import summary (optional)
        logger.info(f"Import finalized: {summary}")

        return summary
    except Exception as e:
        logger.error(f"Failed to finalize import: {e}")
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
