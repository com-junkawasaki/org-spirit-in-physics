import asyncio
import base64
import json
import logging
import websockets
from typing import Optional

logger = logging.getLogger(__name__)

async def generate_audio_hume(api_key: str, text: str) -> Optional[bytes]:
    """
    Generates audio for the given text using Hume AI EVI via direct WebSocket.
    """
    url = f"wss://api.hume.ai/v0/evi/chat?api_key={api_key}"
    
    try:
        async with websockets.connect(url) as websocket:
            # Send text input
            await websocket.send(json.dumps({
                "type": "user_input",
                "text": text
            }))
            
            audio_data = bytearray()
            while True:
                try:
                    # Timeout to prevent hanging if response_end is missed
                    message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                    data = json.loads(message)
                    
                    if data["type"] == "audio_output":
                        audio_data.extend(base64.b64decode(data["data"]))
                    elif data["type"] == "response_end":
                        break
                    elif data["type"] == "error":
                        logger.error(f"Hume API Error: {data.get('message')}")
                        break
                except asyncio.TimeoutError:
                    logger.warning("Hume API timeout reached while waiting for audio output")
                    break
            
            return bytes(audio_data) if audio_data else None
            
    except Exception as e:
        logger.error(f"Hume WebSocket Error: {e}")
        return None


