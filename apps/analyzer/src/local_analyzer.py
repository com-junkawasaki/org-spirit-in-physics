#!/usr/bin/env python3
"""
ローカル環境で実験データを解析するスクリプト
Supabaseが利用できない場合でもデータを処理可能
"""

import json
import os
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class LocalAnalyzer:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.results_dir = Path("results")
        self.results_dir.mkdir(exist_ok=True)
        
        # 川崎モデルのパラメータ
        self.model_params = {
            'alpha': 1.0,
            'gamma': 1.0, 
            'eta': 1.0,
            'lambda': 1.0,
            'epsilon': 0.001
        }
        
        # 単語ベクトルの簡易実装（実際のWord2Vecの代わり）
        self.word_vectors = self._create_simple_word_vectors()
        
    def _create_simple_word_vectors(self) -> Dict[str, np.ndarray]:
        """簡易的な単語ベクトルを作成"""
        jung_words = [
            "head", "green", "water", "to sing", "death", "long", "ship", "to pay", "window", 
            "friendly", "table", "to ask", "village", "cold", "stem", "to dance", "lake", 
            "sick", "pride", "to cook", "ink", "angry", "needle", "to swim", "journey", 
            "blue", "lamp", "to sin", "bread", "rich", "tree", "to prick", "pity", 
            "yellow", "mountain", "to die", "salt", "new", "custom", "to pray", "money", 
            "stupid", "exercise-book", "to despise", "finger", "dear", "bird", "to fall", 
            "book", "unjust", "frog", "to part", "hunger", "white", "child", "to pay attention", 
            "pencil", "sad", "plum", "to marry", "house", "darling", "glass", "to quarrel", 
            "fur", "big", "carrot", "to paint", "part", "old", "flower", "to beat", 
            "box", "wild", "family", "to wash", "cow", "friend", "happiness", "lie", 
            "deportment", "narrow", "brother", "to fear", "stork", "FALSE", "anxiety", 
            "to kiss", "bride", "pure", "door", "to choose", "hay", "contented", 
            "ridicule", "to sleep", "month", "nice", "woman", "to abuse"
        ]
        
        vectors = {}
        np.random.seed(42)  # 再現性のため
        
        for word in jung_words:
            # 各単語に決定論的なベクトルを割り当て
            vector = np.random.normal(0, 0.1, 100)
            vectors[word] = vector
            
        return vectors
    
    def get_word_vector(self, word: str) -> np.ndarray:
        """単語ベクトルを取得"""
        if word in self.word_vectors:
            return self.word_vectors[word]
        else:
            # 未知の単語（日本語など）には決定論的なランダムベクトルを割り当て
            np.random.seed(hash(word) % 2**32)
            return np.random.normal(0, 0.1, 100)
    
    def load_participant_data(self, participant_id: str) -> Dict[str, Any]:
        """参加者のデータを読み込み"""
        participant_dir = self.data_dir / participant_id
        
        if not participant_dir.exists():
            raise FileNotFoundError(f"Participant directory not found: {participant_id}")
        
        # 同意データを読み込み
        consent_file = participant_dir / "consent.json"
        consent_data = {}
        if consent_file.exists():
            with open(consent_file, 'r', encoding='utf-8') as f:
                consent_data = json.load(f)
        
        # セッションデータを読み込み
        session_file = participant_dir / "session_data.json"
        session_data = {}
        if session_file.exists():
            with open(session_file, 'r', encoding='utf-8') as f:
                session_data = json.load(f)
        
        return {
            "participant_id": participant_id,
            "consent": consent_data,
            "session": session_data
        }
    
    def extract_response_data(self, session_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """セッションデータから応答データを抽出"""
        events = session_data.get("events", [])
        responses = []

        # 刺激語を表示したイベントを収集
        stimulus_events = {}
        for event in events:
            if event.get("type") == "word_displayed":
                payload = event.get("payload", {})
                word_index = payload.get("wordIndex", 0)
                stimulus_events[word_index] = {
                    "stimulus_word": payload.get("word", ""),
                    "timestamp": event.get("timestamp", 0),
                    "session": payload.get("session", 1)
                }

        # 音声検出イベントから応答データを抽出
        for event in events:
            if event.get("type") == "speech_detected":
                payload = event.get("payload", {})
                word_index = payload.get("wordIndex", 0)

                # 対応する刺激語イベントを探す
                if word_index in stimulus_events:
                    stimulus_info = stimulus_events[word_index]
                    stimulus_timestamp = stimulus_info["timestamp"]
                    response_timestamp = event.get("timestamp", 0)

                    # 反応時間を計算（ミリ秒）
                    reaction_time_ms = max(100, response_timestamp - stimulus_timestamp)  # 最小100ms

                    response = {
                        "participant_id": session_data.get("participantId"),
                        "stimulus_word": stimulus_info["stimulus_word"],
                        "response_word": payload.get("word", "").strip(),
                        "reaction_time_ms": reaction_time_ms,
                        "session": stimulus_info["session"],
                        "timestamp": response_timestamp,
                        "word_index": word_index
                    }
                    responses.append(response)

        # 重複を除去（同じword_indexに対して複数のspeech_detectedがある場合）
        seen_indices = set()
        unique_responses = []
        for response in responses:
            if response["word_index"] not in seen_indices:
                seen_indices.add(response["word_index"])
                unique_responses.append(response)

        return unique_responses
    
    def calculate_kawasaki_model(self, stimulus_word: str, response_word: str, 
                               reaction_time_ms: int, emotion_score: float = 0.0,
                               skin_potential_delta: float = 0.0) -> Dict[str, Any]:
        """川崎モデルによる計算"""
        
        # 各成分の計算
        vec_i = self.get_word_vector(stimulus_word)
        vec_o = self.get_word_vector(response_word)
        word2vec_comp = np.dot(vec_i, vec_o)
        
        reaction_time_sec = reaction_time_ms / 1000.0
        r = 1 / (reaction_time_sec + self.model_params['epsilon'])
        reaction_comp = r ** self.model_params['alpha']
        
        sp_comp = np.exp(self.model_params['gamma'] * skin_potential_delta / self.model_params['lambda'])
        emotion_comp = np.exp(self.model_params['eta'] * emotion_score)
        
        # 確率の計算
        numerator = np.exp(word2vec_comp) * reaction_comp * sp_comp * emotion_comp
        denominator = 1.0  # 簡易版
        p_value = 1 / (1 + np.exp(-numerator))  # シグモイド
        
        return {
            "p_value": float(p_value),
            "components": {
                "word2vec": float(word2vec_comp),
                "reaction_time": float(reaction_comp),
                "skin_potential": float(sp_comp),
                "emotion": float(emotion_comp)
            },
            "stimulus_word": stimulus_word,
            "response_word": response_word,
            "reaction_time_ms": reaction_time_ms
        }
    
    def analyze_participant(self, participant_id: str) -> Dict[str, Any]:
        """参加者のデータを解析"""
        logging.info(f"Analyzing participant: {participant_id}")
        
        # データ読み込み
        data = self.load_participant_data(participant_id)
        
        # 応答データを抽出
        responses = self.extract_response_data(data["session"])
        
        # 各応答を解析
        analysis_results = []
        for response in responses:
            result = self.calculate_kawasaki_model(
                response["stimulus_word"],
                response["response_word"], 
                response["reaction_time_ms"]
            )
            analysis_results.append(result)
        
        # 統計を計算
        if analysis_results:
            p_values = [r["p_value"] for r in analysis_results]
            stats = {
                "total_responses": len(analysis_results),
                "avg_spirit_probability": np.mean(p_values),
                "max_spirit_probability": np.max(p_values),
                "min_spirit_probability": np.min(p_values),
                "std_spirit_probability": np.std(p_values)
            }
        else:
            stats = {"total_responses": 0}
        
        return {
            "participant_id": participant_id,
            "stats": stats,
            "results": analysis_results
        }
    
    def analyze_all_participants(self) -> Dict[str, Any]:
        """全参加者を解析"""
        if not self.data_dir.exists():
            raise FileNotFoundError(f"Data directory not found: {self.data_dir}")
        
        participant_dirs = [d for d in self.data_dir.iterdir() if d.is_dir()]
        all_results = {}
        
        logging.info(f"Found {len(participant_dirs)} participants to analyze")
        
        for participant_dir in participant_dirs:
            participant_id = participant_dir.name
            try:
                result = self.analyze_participant(participant_id)
                all_results[participant_id] = result
                logging.info(f"Completed analysis for {participant_id}")
            except Exception as e:
                logging.error(f"Failed to analyze {participant_id}: {e}")
                all_results[participant_id] = {"error": str(e)}
        
        return all_results
    
    def save_results(self, results: Dict[str, Any], filename: str = "analysis_results.json"):
        """結果をJSONファイルに保存"""
        output_path = self.results_dir / filename
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False, default=str)
        
        logging.info(f"Results saved to {output_path}")
        return output_path

def main():
    """メイン実行関数"""
    analyzer = LocalAnalyzer()
    
    logging.info("Starting local analysis of Spirit in Physics data...")
    
    # 全参加者のデータを解析
    results = analyzer.analyze_all_participants()
    
    # 結果を保存
    output_file = analyzer.save_results(results)
    
    # 概要を表示
    total_participants = len(results)
    successful_analyses = sum(1 for r in results.values() if "error" not in r)
    
    print("\nAnalysis Summary:")
    print(f"Total participants: {total_participants}")
    print(f"Successful analyses: {successful_analyses}")
    print(f"Results saved to: {output_file}")

    # 全体の統計
    all_p_values = []
    for participant_result in results.values():
        if "results" in participant_result:
            for result in participant_result["results"]:
                if "p_value" in result:
                    all_p_values.append(result["p_value"])

    if all_p_values:
        print("\nOverall Statistics:")
        print(f"Total responses analyzed: {len(all_p_values)}")
        print(f"Average Spirit probability: {np.mean(all_p_values):.4f}")
        print(f"Max Spirit probability: {np.max(all_p_values):.4f}")
        print(f"Min Spirit probability: {np.min(all_p_values):.4f}")

if __name__ == '__main__':
    main()
