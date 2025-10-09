#!/usr/bin/env python3
"""
Hume AI Expression Measurement APIのシミュレーター
実際のAPIコールはせず、感情分析の結果をモックする
"""

import logging
import numpy as np
from typing import Dict, List, Any, Optional
import asyncio
import time

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class HumeAISimulator:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.api_key = config.get('hume_ai', {}).get('api_key', '')
        
        # 感情の種類
        self.emotions = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'contempt']
        
        # 日本語の刺激語に対する感情反応のマッピング（経験則ベース）
        self.emotion_mapping = {
            '愛': {'joy': 0.8, 'surprise': 0.2},
            '死': {'sadness': 0.7, 'fear': 0.5, 'anger': 0.1},
            '怒り': {'anger': 0.9, 'disgust': 0.3},
            '喜び': {'joy': 0.9, 'surprise': 0.4},
            '悲しみ': {'sadness': 0.8, 'fear': 0.2},
            '恐怖': {'fear': 0.8, 'sadness': 0.3},
            '驚き': {'surprise': 0.8, 'joy': 0.2},
            '嫌悪': {'disgust': 0.7, 'anger': 0.3},
            '軽蔑': {'contempt': 0.6, 'anger': 0.2},
            '幸福': {'joy': 0.7, 'surprise': 0.2},
            '絶望': {'sadness': 0.8, 'fear': 0.4},
            '憎悪': {'anger': 0.8, 'disgust': 0.5},
            '平和': {'joy': 0.3, 'sadness': 0.1},
            '混乱': {'fear': 0.4, 'surprise': 0.5},
            '安心': {'joy': 0.4, 'sadness': 0.1},
            '不安': {'fear': 0.7, 'sadness': 0.3},
            '興奮': {'joy': 0.6, 'surprise': 0.4},
            '疲労': {'sadness': 0.5, 'disgust': 0.2},
        }
        
        logging.info("Hume AI Simulator initialized")

    def analyze_video_emotions(self, video_path: str, participant_id: str) -> Dict[str, Any]:
        """
        ビデオファイルから感情を分析（シミュレーション）
        """
        logging.info(f"Analyzing emotions from video: {video_path} for participant {participant_id}")
        
        # ビデオの長さを推定（5-10秒）
        video_duration = np.random.uniform(5, 10)
        
        # 感情の時系列データを生成
        timestamps = np.linspace(0, video_duration, num=int(video_duration * 10))  # 10Hz
        
        emotion_timeseries = []
        for i, timestamp in enumerate(timestamps):
            # 基本的な感情パターン
            base_emotions = {
                'joy': np.random.uniform(0.1, 0.3),
                'sadness': np.random.uniform(0.1, 0.3),
                'anger': np.random.uniform(0.05, 0.2),
                'fear': np.random.uniform(0.05, 0.2),
                'surprise': np.random.uniform(0.1, 0.4),
                'disgust': np.random.uniform(0.05, 0.15),
                'contempt': np.random.uniform(0.05, 0.15)
            }
            
            # 時間経過による感情の変化をシミュレート
            if timestamp < video_duration * 0.3:  # 初期：驚き
                base_emotions['surprise'] += np.random.uniform(0.2, 0.4)
            elif timestamp > video_duration * 0.7:  # 後半：落ち着き
                base_emotions['joy'] += np.random.uniform(0.1, 0.2)
                base_emotions['sadness'] -= np.random.uniform(0.05, 0.1)
            
            # 正規化
            total = sum(base_emotions.values())
            if total > 0:
                for emotion in base_emotions:
                    base_emotions[emotion] /= total
            
            emotion_timeseries.append({
                'timestamp_offset_ms': int(timestamp * 1000),
                'source': 'video',
                'emotion_data': base_emotions
            })
        
        result = {
            'job_id': f"simulated_job_{participant_id}_{int(time.time())}",
            'status': 'completed',
            'emotion_timeseries': emotion_timeseries,
            'metadata': {
                'video_path': video_path,
                'participant_id': participant_id,
                'analysis_duration': video_duration,
                'sampling_rate': 10,  # Hz
                'total_frames': len(timestamps)
            }
        }
        
        logging.info(f"Completed emotion analysis for {participant_id}: {len(emotion_timeseries)} data points")
        return result

    def analyze_audio_emotions(self, audio_path: str, participant_id: str) -> Dict[str, Any]:
        """
        オーディオファイルから感情を分析（シミュレーション）
        """
        logging.info(f"Analyzing emotions from audio: {audio_path} for participant {participant_id}")
        
        # オーディオの長さを推定（2-5秒）
        audio_duration = np.random.uniform(2, 5)
        
        # 感情の時系列データを生成（より高いサンプリングレート）
        timestamps = np.linspace(0, audio_duration, num=int(audio_duration * 25))  # 25Hz
        
        emotion_timeseries = []
        for i, timestamp in enumerate(timestamps):
            # 声の感情パターン（ビデオより感情表現が強い）
            base_emotions = {
                'joy': np.random.uniform(0.2, 0.5),
                'sadness': np.random.uniform(0.1, 0.4),
                'anger': np.random.uniform(0.1, 0.4),
                'fear': np.random.uniform(0.05, 0.3),
                'surprise': np.random.uniform(0.1, 0.4),
                'disgust': np.random.uniform(0.05, 0.2),
                'contempt': np.random.uniform(0.05, 0.2)
            }
            
            # 声の特性を反映した感情変動
            # ピッチやトーンによる感情表現をシミュレート
            if timestamp < audio_duration * 0.2:  # 発話開始
                base_emotions['surprise'] += np.random.uniform(0.1, 0.3)
            elif timestamp > audio_duration * 0.8:  # 発話終了
                base_emotions['joy'] += np.random.uniform(0.1, 0.2)
            
            # 正規化
            total = sum(base_emotions.values())
            if total > 0:
                for emotion in base_emotions:
                    base_emotions[emotion] /= total
            
            emotion_timeseries.append({
                'timestamp_offset_ms': int(timestamp * 1000),
                'source': 'audio',
                'emotion_data': base_emotions
            })
        
        result = {
            'job_id': f"simulated_audio_job_{participant_id}_{int(time.time())}",
            'status': 'completed',
            'emotion_timeseries': emotion_timeseries,
            'metadata': {
                'audio_path': audio_path,
                'participant_id': participant_id,
                'analysis_duration': audio_duration,
                'sampling_rate': 25,  # Hz
                'total_frames': len(timestamps)
            }
        }
        
        logging.info(f"Completed audio emotion analysis for {participant_id}: {len(emotion_timeseries)} data points")
        return result

    def get_stimulus_based_emotions(self, stimulus_word: str) -> Dict[str, float]:
        """
        刺激語に基づく感情反応を取得
        """
        # 刺激語に最も近い感情マッピングを探す
        best_match = {}
        max_similarity = 0
        
        for key_word, emotions in self.emotion_mapping.items():
            # 簡易的な文字列類似度
            similarity = self._calculate_string_similarity(stimulus_word, key_word)
            if similarity > max_similarity:
                max_similarity = similarity
                best_match = emotions
        
        # マッチするものがなければデフォルトの感情を使用
        if not best_match:
            best_match = {
                'joy': 0.2, 'sadness': 0.2, 'anger': 0.1,
                'fear': 0.1, 'surprise': 0.2, 'disgust': 0.1, 'contempt': 0.1
            }
        
        # 少しのノイズを追加
        for emotion in best_match:
            best_match[emotion] += np.random.normal(0, 0.05)
            best_match[emotion] = max(0, min(1, best_match[emotion]))
        
        return best_match

    def _calculate_string_similarity(self, str1: str, str2: str) -> float:
        """2つの文字列間の簡易類似度を計算"""
        # 完全一致
        if str1 == str2:
            return 1.0
        
        # 部分一致
        if str1 in str2 or str2 in str1:
            return 0.8
        
        # 文字レベルの類似度
        chars1 = set(str1)
        chars2 = set(str2)
        intersection = len(chars1.intersection(chars2))
        union = len(chars1.union(chars2))
        
        return intersection / union if union > 0 else 0.0

    async def process_batch_analysis(self, media_files: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        複数のメディアファイルをバッチ処理
        """
        results = []
        
        for media_file in media_files:
            file_path = media_file['path']
            file_type = media_file['type']
            participant_id = media_file['participant_id']
            
            try:
                if file_type == 'video':
                    result = self.analyze_video_emotions(file_path, participant_id)
                elif file_type == 'audio':
                    result = self.analyze_audio_emotions(file_path, participant_id)
                else:
                    logging.warning(f"Unsupported media type: {file_type}")
                    continue
                
                results.append(result)
                
                # APIレート制限をシミュレート
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logging.error(f"Failed to analyze {file_path}: {e}")
                continue
        
        logging.info(f"Batch analysis completed: {len(results)} successful analyses")
        return results

def main():
    """テスト用のメイン関数"""
    config = {
        'hume_ai': {
            'api_key': 'simulated_key'
        }
    }
    
    simulator = HumeAISimulator(config)
    
    # ビデオ分析のテスト
    video_result = simulator.analyze_video_emotions('/fake/video.webm', 'test_participant')
    print(f"Video analysis: {len(video_result['emotion_timeseries'])} data points")
    
    # オーディオ分析のテスト
    audio_result = simulator.analyze_audio_emotions('/fake/audio.wav', 'test_participant')
    print(f"Audio analysis: {len(audio_result['emotion_timeseries'])} data points")
    
    # 刺激語ベースの感情テスト
    emotions = simulator.get_stimulus_based_emotions('死')
    print(f"Emotions for '死': {emotions}")

if __name__ == '__main__':
    main()
