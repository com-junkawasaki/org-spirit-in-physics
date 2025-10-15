#!/usr/bin/env python3
"""
Analysis Engine Service for Spirit in Physics Pipeline.

This service provides analysis algorithms including Kawasaki model,
Hume AI emotion analysis, and physiological data processing.
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
from libs.models.schemas import (
    HumeAnalysisRequest,
    HumeAnalysisResponse,
    AnalysisResultResponse
)

# Import analysis modules
from libs.analysis.kawasaki_model import KawasakiModel
from libs.analysis.emotion_processor import EmotionProcessor
from libs.analysis.hume_data_processor import HumeDataProcessor
from libs.analysis.physiological_processor import PhysiologicalProcessor
from libs.analysis.feature_extractor import FeatureExtractor


logger = setup_logging("analysis-engine")

# Initialize analysis components
kawasaki_model = KawasakiModel()
emotion_processor = EmotionProcessor()
hume_processor = HumeDataProcessor()
physiological_processor = PhysiologicalProcessor()
feature_extractor = FeatureExtractor()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting Analysis Engine Service")
    yield
    logger.info("Shutting down Analysis Engine Service")


app = FastAPI(
    title="Analysis Engine Service",
    description="Analysis algorithms service for Spirit in Physics",
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
    return {"status": "healthy", "service": "analysis-engine"}


@app.post("/api/analyze/kawasaki", response_model=AnalysisResultResponse)
async def run_kawasaki_analysis(session_id: str, model_version: str = "1.0"):
    """Run Kawasaki model analysis."""
    try:
        # Load session data
        session_data = await load_session_data(session_id)

        # Extract features
        features = feature_extractor.extract_features(session_data)

        # Run Kawasaki model
        result = kawasaki_model.calculate_spirit_probability(
            word2vec_vector=features.get('word2vec', []),
            reaction_time=features.get('reaction_time', 0),
            emotion_component=features.get('emotion_component', 0),
            physiological_component=features.get('physiological_component', 0)
        )

        # Create analysis result
        analysis_result = {
            "id": f"analysis-{session_id}-{model_version}",
            "session_id": session_id,
            "participant_id": session_data.get('participant_id', ''),
            "model_version": model_version,
            "spirit_probability": result.get('probability', 0.0),
            "components": result.get('components', {}),
            "created_at": kawasaki_model.now_utc(),
            "metadata": {
                "features": features,
                "model_config": kawasaki_model.get_config()
            }
        }

        logger.info(f"Kawasaki analysis completed for session: {session_id}")

        return AnalysisResultResponse(**analysis_result)
    except Exception as e:
        logger.error(f"Failed to run Kawasaki analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/hume/analyze", response_model=HumeAnalysisResponse)
async def run_hume_analysis(request: HumeAnalysisRequest):
    """Run Hume AI emotion analysis."""
    try:
        # Process video/audio data with Hume AI
        hume_result = await hume_processor.process_media(
            session_id=request.session_id,
            video_data=request.video_data,
            audio_data=request.audio_data
        )

        # Create Hume analysis response
        analysis_response = {
            "id": f"hume-{request.session_id}",
            "session_id": request.session_id,
            "participant_id": hume_result.get('participant_id', ''),
            "emotions": hume_result.get('emotions', {}),
            "prosody": hume_result.get('prosody', {}),
            "language": hume_result.get('language', {}),
            "created_at": hume_processor.now_utc()
        }

        logger.info(f"Hume analysis completed for session: {request.session_id}")

        return HumeAnalysisResponse(**analysis_response)
    except Exception as e:
        logger.error(f"Failed to run Hume analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/physiological/process")
async def process_physiological_data(session_id: str):
    """Process physiological data."""
    try:
        # Load physiological data
        physio_data = await load_physiological_data(session_id)

        # Process physiological signals
        processed_data = physiological_processor.process_signals(physio_data)

        # Calculate physiological component for Kawasaki model
        physio_component = physiological_processor.calculate_physiological_component(processed_data)

        logger.info(f"Physiological processing completed for session: {session_id}")

        return {
            "session_id": session_id,
            "physiological_component": physio_component,
            "processed_data": processed_data
        }
    except Exception as e:
        logger.error(f"Failed to process physiological data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/emotion/process")
async def process_emotion_data(session_id: str):
    """Process emotion data."""
    try:
        # Load emotion data
        emotion_data = await load_emotion_data(session_id)

        # Process emotions
        processed_emotions = emotion_processor.process_emotions(emotion_data)

        # Calculate emotion component for Kawasaki model
        emotion_component = emotion_processor.calculate_emotion_component(processed_emotions)

        logger.info(f"Emotion processing completed for session: {session_id}")

        return {
            "session_id": session_id,
            "emotion_component": emotion_component,
            "processed_emotions": processed_emotions
        }
    except Exception as e:
        logger.error(f"Failed to process emotion data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/import/hume-analysis")
async def import_hume_analysis(session_id: str, participant_id: str, participant_dir: str):
    """Import Hume AI analysis data for a session."""
    try:
        from pathlib import Path
        import json

        dir_path = Path(participant_dir)

        # Find Hume AI artifacts directory
        hume_dirs = list(dir_path.glob("HumeAI_artifacts_*"))

        imported_analyses = []
        for hume_dir in hume_dirs:
            try:
                predictions_file = hume_dir / "HumeAI_predictions_*.json"
                predictions_files = list(hume_dir.glob("HumeAI_predictions_*.json"))

                if not predictions_files:
                    continue

                # Read Hume predictions
                with open(predictions_files[0], 'r', encoding='utf-8') as f:
                    hume_data = json.load(f)

                # Process Hume analysis results
                for prediction in hume_data.get('predictions', []):
                    # Create Hume analysis record
                    hume_record = HumeAnalysis(
                        id=f"hume-{session_id}-{len(imported_analyses)}",
                        session_id=session_id,
                        participant_id=participant_id,
                        emotions=prediction.get('emotions', {}),
                        prosody=prediction.get('prosody', {}),
                        language=prediction.get('language', {}),
                        created_at=hume_processor.now_utc()
                    )

                    # Store Hume analysis data
                    result = hume_processor.store_hume_analysis(hume_record)

                    imported_analyses.append({
                        "id": hume_record.id,
                        "session_id": session_id,
                        "emotions_count": len(hume_record.emotions),
                        "prosody_count": len(hume_record.prosody),
                        "language_count": len(hume_record.language)
                    })

                # Process CSV files if they exist
                registry_dir = predictions_files[0].parent / "registry_file-0-*"
                registry_dirs = list(hume_dir.glob("registry_file-0-*"))

                if registry_dirs:
                    csv_dir = registry_dirs[0] / "csv"
                    if csv_dir.exists():
                        # Process emotion CSV files
                        burst_csv = csv_dir / "burst.csv"
                        face_csv = csv_dir / "face.csv"
                        language_csv = csv_dir / "language.csv"
                        prosody_csv = csv_dir / "prosody.csv"

                        # Additional processing of CSV data could be added here
                        logger.info(f"Hume CSV files found in {csv_dir}")

            except Exception as e:
                logger.warning(f"Failed to process Hume directory {hume_dir}: {e}")
                continue

        logger.info(f"Hume analysis imported for session {session_id}: {len(imported_analyses)} records")

        return {
            "session_id": session_id,
            "hume_analyses_imported": len(imported_analyses),
            "hume_directories_processed": len(hume_dirs)
        }
    except Exception as e:
        logger.error(f"Failed to import Hume analysis for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/validate")
async def validate_analysis_result(result_id: str):
    """Validate analysis results."""
    try:
        # Load analysis result
        result = await load_analysis_result(result_id)

        # Perform validation checks
        validation_result = {
            "result_id": result_id,
            "is_valid": True,
            "checks": {
                "probability_range": 0 <= result.get('spirit_probability', 0) <= 1,
                "required_components": all(key in result.get('components', {})
                                        for key in ['word2vec', 'reaction_time', 'emotion', 'physiological']),
                "data_integrity": result.get('metadata', {}).get('features') is not None
            },
            "score": 0.95  # Mock validation score
        }

        # Mark as invalid if any check fails
        if not all(validation_result['checks'].values()):
            validation_result['is_valid'] = False

        logger.info(f"Validation completed for result: {result_id}")

        return validation_result
    except Exception as e:
        logger.error(f"Failed to validate result: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def load_session_data(session_id: str) -> dict:
    """Load session data from storage service."""
    # This would make HTTP call to storage-adapter service
    # For now, return mock data
    return {
        "session_id": session_id,
        "participant_id": f"participant-{session_id.split('-')[1] if '-' in session_id else 'unknown'}",
        "word2vec_data": [],
        "reaction_time": 1500,
        "emotion_data": {},
        "physiological_data": {}
    }


async def load_physiological_data(session_id: str) -> list:
    """Load physiological data from storage service."""
    # This would make HTTP call to storage-adapter service
    return []


async def load_emotion_data(session_id: str) -> dict:
    """Load emotion data from storage service."""
    # This would make HTTP call to storage-adapter service
    return {}


async def load_analysis_result(result_id: str) -> dict:
    """Load analysis result from storage service."""
    # This would make HTTP call to storage-adapter service
    return {
        "id": result_id,
        "spirit_probability": 0.75,
        "components": {
            "word2vec": 0.3,
            "reaction_time": 0.2,
            "emotion": 0.15,
            "physiological": 0.1
        },
        "metadata": {"features": {}}
    }


if __name__ == "__main__":
    import uvicorn

    service_config = config.services["analysis_engine"]

    uvicorn.run(
        "main:app",
        host=service_config.host,
        port=service_config.port,
        reload=service_config.debug,
        log_level="info"
    )
