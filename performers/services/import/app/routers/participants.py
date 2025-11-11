"""
Participants import router
Merkle DAG: import.service.import.participants
"""
import json
import logging
import os
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.database import get_db_pool

logger = logging.getLogger(__name__)

router = APIRouter()


class ParticipantResult(BaseModel):
    participant_id: str
    status: str
    message: str
    metadata: Optional[dict] = None


class ImportResult(BaseModel):
    success: bool
    total: int
    processed: int
    results: List[ParticipantResult]


@router.post("/participants", response_model=ImportResult)
async def import_participants():
    """Import participants from dataset directory"""
    dataset_path = Path(os.getenv("DATASET_PATH", "/app/dataset/participants"))
    
    if not dataset_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset directory not found: {dataset_path}"
        )
    
    participant_dirs = [d for d in dataset_path.iterdir() if d.is_dir()]
    total_count = len(participant_dirs)
    results = []
    
    pool = await get_db_pool()
    
    for participant_dir in participant_dirs:
        participant_id = participant_dir.name
        
        try:
            async with pool.acquire() as conn:
                async with conn.transaction():
                    result = await process_participant(conn, participant_id, participant_dir)
                    results.append(result)
        except Exception as e:
            logger.error(f"Error importing participant {participant_id}: {e}")
            results.append(ParticipantResult(
                participant_id=participant_id,
                status="error",
                message=str(e),
                metadata=None
            ))
    
    return ImportResult(
        success=True,
        total=total_count,
        processed=len(results),
        results=results
    )


async def process_participant(conn, participant_id: str, participant_path: Path):
    """Process a single participant"""
    # Check if participant already exists
    existing = await conn.fetchval(
        "SELECT id FROM participants WHERE id::text = $1",
        participant_id
    )
    
    if existing:
        logger.info(f"Participant {participant_id} already exists, skipping")
        return ParticipantResult(
            participant_id=participant_id,
            status="skipped",
            message="Participant already exists",
            metadata=None
        )
    
    # Read consent.json
    consent_path = participant_path / "consent.json"
    if not consent_path.exists():
        raise ValueError(f"consent.json not found for participant {participant_id}")
    
    with open(consent_path, 'r', encoding='utf-8') as f:
        consent_data = json.load(f)
    
    # Insert participant
    await conn.execute(
        """
        INSERT INTO participants (id, created_at, updated_at)
        VALUES ($1::uuid, NOW(), NOW())
        """,
        participant_id
    )
    
    logger.info(f"Imported participant {participant_id}")
    
    return ParticipantResult(
        participant_id=participant_id,
        status="success",
        message="Participant imported successfully",
        metadata={"consent": consent_data}
    )

