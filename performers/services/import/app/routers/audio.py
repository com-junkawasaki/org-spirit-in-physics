import os
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from dapr.ext.workflow import DaprWorkflowClient

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/audio/generate")
async def trigger_audio_generation(request: Request, background_tasks: BackgroundTasks):
    """
    Triggers the Dapr workflow to generate stimulus word audio.
    """
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

    # Start Dapr Workflow
    workflow_id = f"audio-generation-{int(os.getpid())}"
    try:
        with DaprWorkflowClient() as wf_client:
            instance_id = wf_client.schedule_new_workflow(
                workflow="stimulus_audio_generation_workflow",
                input={"words": words_to_process, "api_key": api_key},
                instance_id=workflow_id
            )

            return {
                "status": "started",
                "workflow_id": instance_id,
                "total_words": len(words_to_process)
            }
    except Exception as e:
        logger.error(f"Failed to start audio generation workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))
