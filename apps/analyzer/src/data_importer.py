#!/usr/bin/env python3
"""
過去の実験データをSupabaseにインポートするスクリプト
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
import asyncio

from pipeline.data_storer import DataStorer
from pipeline.data_loader import DataLoader
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
            # 同意データのインポート
            consent_file = participant_dir / "consent.json"
            if consent_file.exists():
                with open(consent_file, 'r', encoding='utf-8') as f:
                    consent_data = json.load(f)
                
                # participant_consentsテーブルに保存
                import_result = self.data_storer.supabase.table('participant_consents').insert({
                    "participant_id": consent_data["participantId"],
                    "signature": consent_data["signature"],
                    "agreements": consent_data["agreements"],
                    "agreed_at": consent_data["agreedAt"]
                }).execute()
                
                if import_result.error:
                    logging.error(f"Failed to import consent for {participant_id}: {import_result.error}")
                    return False
                
                logging.info(f"Imported consent data for participant {participant_id}")
            
            # セッションデータのインポート
            session_file = participant_dir / "session_data.json"
            if session_file.exists():
                with open(session_file, 'r', encoding='utf-8') as f:
                    session_data = json.load(f)
                
                # participant_experiment_sessionsとparticipant_response_dataに分割保存
                self._process_session_data(session_data, participant_dir)
                
                logging.info(f"Imported session data for participant {participant_id}")
            
            # メディアファイルのアップロード
            self._upload_media_files(participant_id, participant_dir)
            
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
                experiment_sessions[session_num] = {
                    "participant_id": participant_id,
                    "session_id": f"{participant_id}-session-{session_num}",
                    "session_type": f"session-{session_num}",
                    "start_time": self._timestamp_to_iso(event["timestamp"])
                }
            
            elif event["type"] == "session_completed":
                session_num = event["payload"]["session"]
                if session_num in experiment_sessions:
                    experiment_sessions[session_num]["end_time"] = self._timestamp_to_iso(event["timestamp"])
            
            elif event["type"] == "word_response_recorded":
                payload = event["payload"]
                response_data.append({
                    "participant_id": participant_id,
                    "experiment_id": f"{participant_id}-exp-{payload.get('session', 1)}",
                    "word_stimulus_id": payload.get("wordIndex", 1) + 1,  # 0-indexed to 1-indexed
                    "stimulus_word": payload.get("stimulusWord", ""),
                    "response_word": payload.get("responseWord", ""),
                    "reaction_time_ms": payload.get("reactionTime", 0),
                    "session": f"session-{payload.get('session', 1)}",
                    "timestamp": self._timestamp_to_iso(event["timestamp"])
                })
        
        # 実験セッションを保存
        for session_info in experiment_sessions.values():
            try:
                self.data_storer.supabase.table('participant_experiment_sessions').upsert(
                    session_info, on_conflict="participant_id,session_id"
                ).execute()
            except Exception as e:
                logging.warning(f"Failed to save experiment session: {e}")
        
        # 応答データを保存（バッチ処理）
        if response_data:
            try:
                # 重複を避けるため、UPSERTを使用
                for response in response_data:
                    self.data_storer.supabase.table('participant_response_data').upsert(
                        response, 
                        on_conflict="participant_id,experiment_id,word_stimulus_id,timestamp"
                    ).execute()
            except Exception as e:
                logging.error(f"Failed to save response data: {e}")
    
    def _upload_media_files(self, participant_id: str, participant_dir: Path):
        """メディアファイルをSupabase Storageにアップロード"""
        import tempfile
        
        video_files = list(participant_dir.glob("session-*-video.webm"))
        
        for video_file in video_files:
            if video_file.exists():
                # セッション番号を抽出 (session-1-video.webm -> session-1)
                session_match = video_file.stem.split('-video')[0]  # "session-1"
                
                try:
                    # 一時ディレクトリにファイルをコピー
                    with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
                        temp_path = temp_file.name
                    
                    # ファイルをコピー
                    with open(video_file, 'rb') as src, open(temp_path, 'wb') as dst:
                        dst.write(src.read())
                    
                    # Supabase Storageにアップロード
                    storage_path = f"{participant_id}/{session_match}/{video_file.name}"
                    
                    with open(temp_path, 'rb') as f:
                        self.data_storer.supabase.storage.from_('spirit-in-physics').upload(
                            storage_path, f, {"content-type": "video/webm"}
                        )
                    
                    # 一時ファイルを削除
                    os.unlink(temp_path)
                    
                    logging.info(f"Uploaded {video_file.name} to storage")
                    
                except Exception as e:
                    logging.error(f"Failed to upload {video_file.name}: {e}")
    
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
