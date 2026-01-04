import asyncio
import base64
import os
import json
from hume import AsyncHumeClient
from hume.empathic_voice.chat.socket_client import ChatConnectOptions
from hume.empathic_voice.chat.types import SubscribeEvent

# Hardcoded translations for demonstration
STIMULUS_WORDS = {
    1: {"ja": "頭", "en": "Head", "fr": "Tête", "es": "Cabeza", "ru": "Голова", "ar": "رأس", "zh": "头"},
    2: {"ja": "緑", "en": "Green", "fr": "Vert", "es": "Verde", "ru": "Зеленый", "ar": "أخضر", "zh": "绿"},
    3: {"ja": "水", "en": "Water", "fr": "Eau", "es": "Agua", "ru": "Вода", "ar": "ماء", "zh": "水"},
    4: {"ja": "歌う", "en": "Sing", "fr": "Chanter", "es": "Cantar", "ru": "Петь", "ar": "يغني", "zh": "唱"},
    17: {"ja": "海", "en": "Sea", "fr": "Mer", "es": "Mar", "ru": "Море", "ar": "بحر", "zh": "海"},
}

HUME_API_KEY = os.getenv("HUME_API_KEY", "w3G1Xy2ZP9qrKaKuy2QklvmGysJK4SEoPychem3d30rs3ZKA")

async def generate_audio(text, lang_code, output_path):
    print(f"Generating audio for '{text}' in {lang_code}...")
    client = AsyncHumeClient(api_key=HUME_API_KEY)
    
    # Connect to EVI
    options = ChatConnectOptions()
    async with client.empathic_voice.chat.connect(options=options) as socket:
        # Send text to be spoken
        await socket.send_text(text)
        
        audio_data = bytearray()
        async for event in socket:
            if event.type == "audio_output":
                # event.data is already base64 decoded by the SDK if it's a pydantic model
                # but wait, let me check the SDK event type
                audio_data.extend(base64.b64decode(event.data))
            elif event.type == "response_end":
                break
        
        if audio_data:
            with open(output_path, "wb") as f:
                f.write(audio_data)
            print(f"Saved audio to {output_path}")
            return audio_data
        else:
            print(f"No audio generated for '{text}'")
            return None

async def main():
    os.makedirs("generated_audio", exist_ok=True)
    
    for id, translations in STIMULUS_WORDS.items():
        for lang, text in translations.items():
            filename = f"{id}_{lang}.wav"
            filepath = os.path.join("generated_audio", filename)
            
            if os.path.exists(filepath):
                print(f"Skipping {filename}, already exists.")
                continue
                
            # For EVI, we might need to set the language in the prompt or config
            # but EVI 2 is auto-detecting or we can provide context
            # For now, let's just send the text
            try:
                await generate_audio(text, lang, filepath)
            except Exception as e:
                print(f"Error generating audio for {text}: {e}")
            
            await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())
