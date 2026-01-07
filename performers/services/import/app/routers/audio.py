import os
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from temporalio.client import Client

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/audio/generate")
async def trigger_audio_generation(request: Request, background_tasks: BackgroundTasks):
    """
    Triggers the Temporal workflow to generate stimulus word audio.
    """
    temporal_client: Client = request.app.state.temporal_client
    if not temporal_client:
        raise HTTPException(status_code=503, detail="Temporal client not connected")
    
    # Get Hume API Key from request or env
    try:
        body = await request.json()
        api_key = body.get("api_key") or os.getenv("HUME_API_KEY")
    except:
        api_key = os.getenv("HUME_API_KEY")
        
    if not api_key:
        raise HTTPException(status_code=400, detail="Hume API Key is required")
    
    # Get stimulus words from DB
    from app.database import get_db_pool
    pool = await get_db_pool()
    words_to_process = []
    
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, japanese, english, french, spanish, russian, arabic, chinese FROM stimulus_words")
        for row in rows:
            # Map of lang -> text
            langs = {
                "ja": row["japanese"],
                "en": row["english"],
                "fr": row["french"],
                "es": row["spanish"],
                "ru": row["russian"],
                "ar": row["arabic"],
                "zh": row["chinese"]
            }
            for lang, text in langs.items():
                if text:
                    words_to_process.append({
                        "id": row["id"],
                        "text": text,
                        "lang": lang
                    })
    
    if not words_to_process:
        return {"status": "skipped", "message": "No stimulus words found in database"}
    
    # Start Temporal Workflow
    workflow_id = f"audio-generation-{int(os.getpid())}"
    try:
        handle = await temporal_client.start_workflow(
            "StimulusAudioGenerationWorkflow",
            {"words": words_to_process, "api_key": api_key},
            id=workflow_id,
            task_queue="import-task-queue"
        )
        
        return {
            "status": "started",
            "workflow_id": workflow_id,
            "run_id": handle.run_id,
            "total_words": len(words_to_process)
        }
    except Exception as e:
        logger.error(f"Failed to start audio generation workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))



