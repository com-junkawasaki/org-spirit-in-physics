#!/usr/bin/env python3
"""
Hume AI APIの動作テスト
"""

import asyncio
import logging
import yaml
import sys
import os

# モジュールパスを追加
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from pipeline.emotion_processor import EmotionProcessor

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

async def test_hume_api():
    """Hume AI APIの動作テスト"""
    
    # 設定読み込み
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    # EmotionProcessor初期化
    emotion_processor = EmotionProcessor(config['hume_ai'])
    
    print("Hume AI API Test Starting...")
    print(f"Using Real API: {emotion_processor.use_real_api}")
    
    # テスト用のファイルパス（存在しないファイルでもテスト可能）
    test_video = "/fake/test_video.webm"
    test_audio = "/fake/test_audio.wav"
    
    try:
        # ビデオテスト
        print("\nTesting video emotion analysis...")
        video_emotions = await emotion_processor.process_media_file(
            test_video, "video", "test_participant"
        )
        print(f"Video emotions: {len(video_emotions)} data points")
        
        # オーディオテスト
        print("\nTesting audio emotion analysis...")
        audio_emotions = await emotion_processor.process_media_file(
            test_audio, "audio", "test_participant"
        )
        print(f"Audio emotions: {len(audio_emotions)} data points")
        
        # 感情データのサンプル表示
        if video_emotions:
            print(f"\nSample emotion data: {video_emotions[0]}")
        
        print("\nHume AI API Test Completed Successfully!")
        
    except Exception as e:
        print(f"Hume AI API Test Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_hume_api())
