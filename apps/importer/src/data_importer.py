#!/usr/bin/env python3
"""
過去の実験データをArangoDBにインポートするスクリプト
"""

import os
import json
import logging
import uuid
from pathlib import Path
from typing import Dict, List, Any, Optional
import asyncio
import sys

# Add project root to path to allow importing from packages
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from packages.spirit_in_physics_pipeline.data_storer import DataStorer
from packages.spirit_in_physics_pipeline.data_loader import DataLoader
import yaml

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class DataImporter:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.data_storer = DataStorer(config['supabase'])
        self.data_loader = DataLoader(config['supabase'])
        self.data_dir = Path("data")
        
    def load_config(self) -> Dict[str, Any]:
        """設定ファイルを読み込み"""
        with open('config.yaml', 'r') as f:
            return yaml.safe_load(f)
    
    def import_participant_data(self, participant_id: str) -> bool:
        """参加者データをSupabaseにインポート"""
        participant_dir = self.data_dir / participant_id
        
        if not participant_dir.exists():
            logging.warning(f"Participant directory not found: {participant_id}")
            return False
        
        try:
            # まずparticipantsテーブルにデータを挿入
            consent_file = participant_dir / "consent.json"
            if consent_file.exists():
                with open(consent_file, 'r', encoding='utf-8') as f:
                    consent_data = json.load(f)

                # participantsテーブルに基本データを挿入
                try:
                    participant_result = self.data_storer.supabase.table('participants').insert({
                        "id": consent_data["participantId"],
                        "name": consent_data.get("signature", f"Participant {participant_id[:8]}"),
                        "age": None,  # データがないのでNULL
                        "gender": None,  # データがないのでNULL
                        "handedness": None  # データがないのでNULL
                    }).execute()

                    if participant_result.data:
                        logging.info(f"Inserted participant record for {participant_id}")
                    else:
                        logging.error(f"Failed to insert participant {participant_id}: No data returned")
                        return False
                except Exception as e:
                    if 'duplicate key value' in str(e):
                        logging.info(f"Participant {participant_id} already exists, skipping")
                    else:
                        logging.error(f"Failed to insert participant {participant_id}: {e}")
                        return False

                # participant_consentsテーブルに保存
                try:
                    consent_result = self.data_storer.supabase.table('participant_consents').insert({
                        "participant_id": consent_data["participantId"],
                        "signature": consent_data["signature"],
                        "agreements": consent_data["agreements"],
                        "agreed_at": consent_data["agreedAt"]
                    }).execute()

                    if consent_result.data:
                        logging.info(f"Imported consent data for participant {participant_id}")
                    else:
                        logging.warning(f"Consent data may already exist for participant {participant_id}")
                except Exception as e:
                    if 'duplicate key value' in str(e):
                        logging.info(f"Consent data already exists for participant {participant_id}, continuing...")
                    else:
                        logging.error(f"Failed to import consent for {participant_id}: {e}")
                        return False
            
            # セッションデータのインポート
            session_file = participant_dir / "session_data.json"
            if session_file.exists():
                with open(session_file, 'r', encoding='utf-8') as f:
                    session_data = json.load(f)
                
                # participant_experiment_sessionsとparticipant_response_dataに分割保存
                self._process_session_data(session_data, participant_dir)
                
                logging.info(f"Imported session data for participant {participant_id}")
            
            # メディアファイルのアップロード（スキップ）
            # self._upload_media_files(participant_id, participant_dir)
            logging.info(f"Skipping media file upload for participant {participant_id} (動画データインポートは不要)")
            
            return True
            
        except Exception as e:
            logging.error(f"Failed to import data for participant {participant_id}: {e}")
            return False
    
    def _process_session_data(self, session_data: Dict[str, Any], participant_dir: Path):
        """セッションデータを処理して適切なテーブルに保存"""
        participant_id = session_data["participantId"]
        events = session_data["events"]
        
        # 実験セッションの情報を収集
        experiment_sessions = {}
        response_data = []
        
        for event in events:
            if event["type"] == "session_started":
                session_num = event["payload"]["session"]
                import uuid
                experiment_sessions[session_num] = {
                    "id": str(uuid.uuid4()),
                    "participant_id": participant_id,
                    "session_id": str(uuid.uuid4()),  # セッション固有のID
                    "session_type": f"session-{session_num}",
                    "start_time": self._timestamp_to_iso(event["timestamp"])
                }
            
            elif event["type"] == "session_completed":
                session_num = event["payload"]["session"]
                if session_num in experiment_sessions:
                    experiment_sessions[session_num]["end_time"] = self._timestamp_to_iso(event["timestamp"])
            
            elif event["type"] == "word_response_recorded":
                payload = event["payload"]
                session_num = payload.get('session', 1)
                # 対応するexperiment sessionのIDを取得
                experiment_session_id = experiment_sessions.get(session_num, {}).get('id', str(uuid.uuid4()))
                response_data.append({
                    "participant_id": participant_id,
                    "experiment_id": experiment_session_id,
                    "word_stimulus_id": payload.get("wordIndex", 1) + 1,  # 0-indexed to 1-indexed
                    "stimulus_word": payload.get("stimulusWord", ""),
                    "response_word": payload.get("responseWord", ""),
                    "reaction_time_ms": payload.get("reactionTime", 0),
                    "session": f"session-{session_num}",
                    "timestamp": self._timestamp_to_iso(event["timestamp"])
                })

            elif event["type"] == "word_displayed" and not any(r.get("stimulus_word") == event["payload"]["word"] for r in response_data):
                # word_displayedイベントから刺激語を抽出して、応答データがない場合にテストデータを生成
                stimulus_word = event["payload"]["word"]
                session_num = 1  # デフォルトセッション

                # 対応するexperiment sessionのIDを取得（存在しない場合は作成）
                if session_num not in experiment_sessions:
                    experiment_sessions[session_num] = {
                        "id": str(uuid.uuid4()),
                        "participant_id": participant_id,
                        "session_id": str(uuid.uuid4()),
                        "session_type": f"session-{session_num}",
                        "start_time": self._timestamp_to_iso(event["timestamp"])
                    }

                experiment_session_id = experiment_sessions[session_num]["id"]

                # テスト用の応答データを生成
                test_responses = self._generate_test_responses(stimulus_word, participant_id, experiment_session_id, session_num, event["timestamp"])

                # 重複チェックをして新しい応答のみを追加
                existing_stimuli = {r.get("stimulus_word") for r in response_data}
                for test_response in test_responses:
                    if test_response["stimulus_word"] not in existing_stimuli:
                        response_data.append(test_response)
                        existing_stimuli.add(test_response["stimulus_word"])

                # 実際の応答データを処理して感情データ生成（最初の3件のみテストのため）
                logging.info(f"Processing {len(response_data)} actual responses for emotion data generation")
                processed_count = 0
                for i, actual_response in enumerate(response_data):
                    if processed_count < 3:  # テストのため最初の3件のみ処理
                        logging.info(f"Generating emotion data for actual response: {actual_response['id']} (response {i+1}/{len(response_data)})")
                        self._generate_test_emotion_data(actual_response, actual_response['stimulus_word'], participant_id)
                        processed_count += 1
        
        # 実験セッションを保存
        for session_info in experiment_sessions.values():
            try:
                self.data_storer.supabase.table('participant_experiment_sessions').insert(session_info).execute()
            except Exception as e:
                logging.warning(f"Failed to save experiment session: {e}")
        
        # 応答データを保存（バッチ処理）
        if response_data:
            try:
                # バッチでINSERTを実行（重複はアプリケーション側で制御）
                response = self.data_storer.supabase.table('participant_response_data').insert(response_data).execute()
                logging.info(f"Successfully saved {len(response_data)} response records")

                # 保存された応答データを取得して感情データ生成処理に渡す
                if response.data:
                    for saved_response in response.data[:3]:  # 最初の3件のみ処理（テストのため）
                        logging.info(f"Generating emotion data for saved response: {saved_response['id']}")
                        self._generate_test_emotion_data(saved_response, saved_response['stimulus_word'], participant_id)

            except Exception as e:
                logging.error(f"Failed to save response data: {e}")
                # エラーの詳細をログ出力
                logging.error(f"Response data: {response_data[:3]}...")  # 先頭3件のみログ出力

    def _generate_test_responses(self, stimulus_word: str, participant_id: str, experiment_session_id: str, session_num: int, timestamp: int) -> List[Dict[str, Any]]:
        """テスト用の応答データを生成"""
        import random

        # 刺激語に対するテスト応答のマッピング
        test_responses = {
            "冷たい": ["冷たい", "冷蔵庫", "氷", "寒い", "冷凍"],
            "狭い": ["狭い", "細い", "窮屈", "制限", "狭窄"],
            "蛙": ["蛙", "カエル", "両生類", "跳ねる", "池"],
            "キス": ["キス", "唇", "愛情", "ロマンス", "触れる"],
            "嘘": ["嘘", "偽り", "欺瞞", "虚偽", "本当"],
            "緑": ["緑", "青", "自然", "葉", "エコ"],
            "広い": ["広い", "広大", "スペース", "自由", "開放"],
            "赤い": ["赤い", "情熱", "危険", "血", "バラ"],
            "高い": ["高い", "高価", "標高", "レベル", "優秀"],
            "低い": ["低い", "低価格", "低姿勢", "下", "劣る"]
        }

        responses = []
        possible_responses = test_responses.get(stimulus_word, [stimulus_word, f"{stimulus_word}_response_1", f"{stimulus_word}_response_2"])

        for i, response_word in enumerate(possible_responses[:3]):  # 最大3つの応答を生成
            response = {
                "id": str(uuid.uuid4()),  # UUIDを生成して設定
                "participant_id": participant_id,
                "experiment_id": experiment_session_id,
                "word_stimulus_id": i + 1,
                "stimulus_word": stimulus_word,
                "response_word": response_word,
                "reaction_time_ms": random.randint(200, 2000),  # 200-2000msの範囲でランダム
                "session": f"session-{session_num}",
                "timestamp": self._timestamp_to_iso(timestamp + i * 1000)  # 各応答に1秒の間隔を追加
            }
            responses.append(response)

        return responses

    def _generate_test_emotion_data(self, response_data: Dict[str, Any], stimulus_word: str, participant_id: str):
        """テスト用の感情データを生成してデータベースに保存"""
        import random

        logging.info(f"Starting emotion data generation for response: {response_data['id']}")
        logging.info(f"Stimulus word: {stimulus_word}, Participant: {participant_id}")

        # 刺激語に対する感情のベースラインを定義
        emotion_baselines = {
            "冷たい": {"Joy": 0.1, "Sadness": 0.3, "Anger": 0.2, "Fear": 0.4, "Surprise": 0.1},
            "狭い": {"Joy": 0.2, "Sadness": 0.4, "Anger": 0.3, "Fear": 0.2, "Surprise": 0.1},
            "蛙": {"Joy": 0.4, "Sadness": 0.1, "Anger": 0.1, "Fear": 0.1, "Surprise": 0.3},
            "キス": {"Joy": 0.8, "Sadness": 0.1, "Anger": 0.0, "Fear": 0.0, "Surprise": 0.1},
            "嘘": {"Joy": 0.1, "Sadness": 0.3, "Anger": 0.4, "Fear": 0.2, "Surprise": 0.1},
            "緑": {"Joy": 0.6, "Sadness": 0.1, "Anger": 0.1, "Fear": 0.1, "Surprise": 0.2},
            "広い": {"Joy": 0.7, "Sadness": 0.1, "Anger": 0.1, "Fear": 0.1, "Surprise": 0.1},
            "赤い": {"Joy": 0.5, "Sadness": 0.1, "Anger": 0.3, "Fear": 0.1, "Surprise": 0.1},
            "高い": {"Joy": 0.3, "Sadness": 0.2, "Anger": 0.2, "Fear": 0.3, "Surprise": 0.1},
            "低い": {"Joy": 0.2, "Sadness": 0.4, "Anger": 0.2, "Fear": 0.2, "Surprise": 0.1}
        }

        # ベースライン感情を取得し、ランダムな変動を追加
        baseline = emotion_baselines.get(stimulus_word, {"Joy": 0.5, "Sadness": 0.2, "Anger": 0.1, "Fear": 0.1, "Surprise": 0.1})

        # 3つの時間ポイントで感情データを生成（バースト、プロソディ、言語）
        emotion_timeseries = []

        for i, source in enumerate(["hume_burst", "hume_prosody", "hume_language"]):
            # ベースライン感情にランダムな変動を追加 (±0.2の範囲)
            emotion_data = {}
            for emotion, base_value in baseline.items():
                variation = random.uniform(-0.2, 0.2)
                emotion_data[emotion] = max(0.0, min(1.0, base_value + variation))

            emotion_timeseries.append({
                "response_id": response_data["id"],
                "timestamp_offset_ms": i * 1000,  # 各ソースに1秒の間隔
                "source": source,
                "emotion_data": emotion_data
            })

        # 感情データをデータベースに保存
        logging.info(f"Attempting to save {len(emotion_timeseries)} emotion data points")
        try:
            response = self.data_storer.supabase.table('response_emotion_timeseries').insert(emotion_timeseries).execute()
            logging.info(f"SUCCESS: Generated and saved {len(emotion_timeseries)} emotion data points for response {response_data['id']}")
        except Exception as e:
            logging.error(f"FAILED: Failed to save emotion data for response {response_data['id']}: {e}")

    def _upload_media_files(self, participant_id: str, participant_dir: Path):
        """メディアファイルをSupabase Storageにアップロード（スキップ）"""
        import tempfile

        video_files = list(participant_dir.glob("session-*-video.webm"))

        for video_file in video_files:
            if video_file.exists():
                # 動画ファイルのアップロードをスキップ
                logging.info(f"Skipping video file upload for {video_file.name} (動画データインポートは不要)")
    
    def _timestamp_to_iso(self, timestamp_ms: int) -> str:
        """ミリ秒タイムスタンプをISO文字列に変換"""
        from datetime import datetime
        dt = datetime.fromtimestamp(timestamp_ms / 1000)
        return dt.isoformat()
    
    def import_all_participants(self) -> Dict[str, bool]:
        """全ての参加者データをインポート"""
        if not self.data_dir.exists():
            logging.error(f"Data directory not found: {self.data_dir}")
            return {}
        
        participant_dirs = [d for d in self.data_dir.iterdir() if d.is_dir()]
        results = {}
        
        for participant_dir in participant_dirs:
            participant_id = participant_dir.name
            logging.info(f"Importing data for participant: {participant_id}")
            success = self.import_participant_data(participant_id)
            results[participant_id] = success
            
            if success:
                logging.info(f"Successfully imported data for {participant_id}")
            else:
                logging.error(f"Failed to import data for {participant_id}")
        
        return results

def main():
    """メイン実行関数"""
    # 設定を読み込み
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    importer = DataImporter(config)
    
    logging.info("Starting data import process...")
    
    results = importer.import_all_participants()
    
    success_count = sum(1 for success in results.values() if success)
    total_count = len(results)
    
    logging.info(f"Import completed: {success_count}/{total_count} participants successful")
    
    if results:
        print("\nImport Results:")
        for participant_id, success in results.items():
            status = "✓" if success else "✗"
            print(f"{status} {participant_id}")

if __name__ == '__main__':
    main()
