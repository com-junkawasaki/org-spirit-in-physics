import asyncio
import base64
import os
import json
import websockets

# Hardcoded translations for demonstration
STIMULUS_WORDS = {
    1: {"ja": "頭", "en": "Head", "fr": "Tête", "es": "Cabeza", "ru": "Голова", "ar": "رأس", "zh": "头"},
    2: {"ja": "緑", "en": "Green", "fr": "Vert", "es": "Verde", "ru": "Зеленый", "ar": "أخضر", "zh": "绿"},
    3: {"ja": "水", "en": "Water", "fr": "Eau", "es": "Agua", "ru": "Вода", "ar": "ماء", "zh": "水"},
    4: {"ja": "歌う", "en": "Sing", "fr": "Chanter", "es": "Cantar", "ru": "Петь", "ar": "يغني", "zh": "唱"},
    17: {"ja": "海", "en": "Sea", "fr": "Mer", "es": "Mar", "ru": "Море", "ar": "بحر", "zh": "海"},
}

HUME_API_KEY = "w3G1Xy2ZP9qrKaKuy2QklvmGysJK4SEoPychem3d30rs3ZKA"

async def generate_audio(text, lang_code, output_path):
    print(f"Generating audio for '{text}' in {lang_code}...")
    url = f"wss://api.hume.ai/v0/evi/chat?api_key={HUME_API_KEY}"
    
    async with websockets.connect(url) as websocket:
        # Send text input
        # Note: EVI 2 supports custom voice and config, but we use defaults for now
        await websocket.send(json.dumps({
            "type": "user_input",
            "text": text
        }))
        
        audio_data = bytearray()
        try:
            while True:
                message = await websocket.recv()
                data = json.loads(message)
                
                if data["type"] == "audio_output":
                    audio_data.extend(base64.b64decode(data["data"]))
                elif data["type"] == "response_end":
                    break
                elif data["type"] == "error":
                    print(f"API Error: {data.get('message')}")
                    break
        except Exception as e:
            print(f"WebSocket Error: {e}")
        
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
                
            try:
                await generate_audio(text, lang, filepath)
            except Exception as e:
                print(f"Error generating audio for {text}: {e}")
            
            await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())






