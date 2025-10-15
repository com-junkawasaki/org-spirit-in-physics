#!/usr/bin/env python3
"""
皮膚電位データの時系列同期処理モジュール
"""

import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import json

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class PhysiologicalProcessor:
    def __init__(self):
        self.baseline_window_ms = 2000  # ベースライン計算用の時間窓（2秒）
        self.response_window_ms = 5000  # 反応分析用の時間窓（5秒）
        
    def load_skin_potential_data(self, response_id: str, neo4j_client) -> List[Dict[str, Any]]:
        """
        Neo4jから皮膚電位の時系列データを読み込み
        """
        logging.info(f"Loading skin potential data for response {response_id}")

        # TODO: Implement Neo4j query for skin potential data
        # For now, return empty list as this needs to be migrated
        logging.warning(f"Skin potential data loading not yet implemented for Neo4j")
        return []
    
    def calculate_baseline(self, sp_data: List[Dict[str, Any]], 
                          stimulus_timestamp_ms: int = 0) -> float:
        """
        刺激提示前のベースライン皮膚電位を計算
        """
        if not sp_data:
            return 0.0
        
        # 刺激提示前のデータを抽出（-2000ms から 0ms）
        baseline_start = max(0, stimulus_timestamp_ms - self.baseline_window_ms)
        
        baseline_values = [
            item['value'] for item in sp_data 
            if baseline_start <= item['timestamp_offset_ms'] < stimulus_timestamp_ms
        ]
        
        if not baseline_values:
            # ベースラインデータがない場合は全体の平均を使用
            baseline_values = [item['value'] for item in sp_data]
        
        baseline = np.mean(baseline_values) if baseline_values else 0.0
        logging.info(f"Calculated baseline: {baseline:.4f} from {len(baseline_values)} points")
        return baseline
    
    def calculate_response_delta(self, sp_data: List[Dict[str, Any]], 
                                stimulus_timestamp_ms: int = 0, 
                                baseline: float = 0.0) -> Dict[str, Any]:
        """
        刺激提示後の皮膚電位変化を計算（川崎モデルのΔSP）
        """
        if not sp_data:
            return {
                "delta_sp": 0.0,
                "max_change": 0.0,
                "response_integral": 0.0,
                "response_duration_ms": 0,
                "data_points": 0,
                "baseline_value": baseline
            }
        
        # 反応分析用の時間窓（0ms から 5000ms）
        response_end = stimulus_timestamp_ms + self.response_window_ms
        
        response_values = [
            item['value'] for item in sp_data 
            if stimulus_timestamp_ms <= item['timestamp_offset_ms'] <= response_end
        ]
        
        if not response_values:
            return {
                "delta_sp": 0.0,
                "max_change": 0.0,
                "response_integral": 0.0,
                "response_duration_ms": 0,
                "data_points": 0,
                "baseline_value": 0.0
            }
        
        # ベースラインからの最大変化を計算
        changes = [val - baseline for val in response_values]
        max_change = max(changes) if changes else 0.0
        
        # 反応の積分値（変化の総和）を計算
        response_integral = np.trapz(changes, dx=100) if len(changes) > 1 else 0.0  # 100ms間隔を仮定
        
        result = {
            "delta_sp": max_change,  # 川崎モデルのΔSPとして使用
            "max_change": max_change,
            "response_integral": response_integral,
            "response_duration_ms": self.response_window_ms,
            "data_points": len(response_values),
            "baseline_value": baseline
        }
        
        logging.info(f"Calculated skin potential response: ΔSP={max_change:.4f}, integral={response_integral:.4f}")
        return result
    
    def synchronize_with_reaction(self, sp_data: List[Dict[str, Any]], 
                                 reaction_timestamp_ms: int) -> List[Dict[str, Any]]:
        """
        皮膚電位データを反応イベントのタイムスタンプと同期
        反応時刻をt=0として時間を再設定
        """
        synchronized_data = []
        
        for data_point in sp_data:
            synchronized_point = data_point.copy()
            # 反応時刻を基準とした相対時間を計算
            synchronized_point['timestamp_offset_ms'] = data_point['timestamp_offset_ms'] - reaction_timestamp_ms
            synchronized_data.append(synchronized_point)
        
        # 時間順にソート
        synchronized_data.sort(key=lambda x: x['timestamp_offset_ms'])
        
        logging.info(f"Synchronized {len(synchronized_data)} data points with reaction timestamp")
        return synchronized_data
    
    def extract_features_for_response(self, response_data: Dict[str, Any], 
                                    sp_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        応答データと皮膚電位データから特徴量を抽出
        """
        # 刺激提示時刻（仮定: 応答データのタイムスタンプを使用）
        stimulus_timestamp_ms = 0  # 相対時間として扱う
        
        # ベースライン計算
        baseline = self.calculate_baseline(sp_data, stimulus_timestamp_ms)
        
        # 反応ΔSP計算
        sp_features = self.calculate_response_delta(sp_data, stimulus_timestamp_ms, baseline)
        
        # 同期データ
        synchronized_data = self.synchronize_with_reaction(sp_data, stimulus_timestamp_ms)
        
        features = {
            "physiological_features": {
                "baseline": baseline,
                "delta_sp": sp_features["delta_sp"],
                "max_change": sp_features["max_change"],
                "response_integral": sp_features["response_integral"],
                "response_duration_ms": sp_features["response_duration_ms"],
                "data_points": sp_features["data_points"]
            },
            "synchronized_timeseries": synchronized_data,
            "metadata": {
                "response_id": response_data.get("id"),
                "stimulus_word": response_data.get("stimulus_word"),
                "response_word": response_data.get("response_word"),
                "reaction_time_ms": response_data.get("reaction_time_ms"),
                "processing_timestamp": datetime.now().isoformat()
            }
        }
        
        return features
    
    def validate_timeseries_data(self, sp_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        時系列データの品質を検証
        """
        if not sp_data:
            return {"valid": False, "issues": ["No data points"]}
        
        issues = []
        
        # データポイント数のチェック
        if len(sp_data) < 10:
            issues.append("Insufficient data points")
        
        # 時間間隔のチェック
        timestamps = [item['timestamp_offset_ms'] for item in sp_data]
        intervals = np.diff(sorted(timestamps))
        
        if len(intervals) > 0:
            mean_interval = np.mean(intervals)
            std_interval = np.std(intervals)
            
            # 間隔が不均一すぎる場合
            if std_interval / mean_interval > 0.5:
                issues.append("Irregular time intervals")
            
            # 間隔が大きすぎる場合（1秒以上）
            if mean_interval > 1000:
                issues.append("Large time gaps between measurements")
        
        # 値の範囲チェック
        values = [item['value'] for item in sp_data]
        if values:
            value_range = max(values) - min(values)
            if value_range < 0.1:  # 範囲が小さすぎる
                issues.append("Limited value range")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "data_points": len(sp_data),
            "time_range_ms": max(timestamps) - min(timestamps) if timestamps else 0,
            "value_range": max(values) - min(values) if values else 0
        }

def main():
    """テスト用のメイン関数"""
    processor = PhysiologicalProcessor()
    
    # モックデータでテスト
    mock_sp_data = [
        {"timestamp_offset_ms": -1000, "value": 1.2},
        {"timestamp_offset_ms": -500, "value": 1.3},
        {"timestamp_offset_ms": 0, "value": 1.25},
        {"timestamp_offset_ms": 500, "value": 1.8},
        {"timestamp_offset_ms": 1000, "value": 2.1},
        {"timestamp_offset_ms": 1500, "value": 1.9},
    ]
    
    mock_response_data = {
        "id": "test-response-123",
        "stimulus_word": "death",
        "response_word": "sad",
        "reaction_time_ms": 1200
    }
    
    # 特徴量抽出
    features = processor.extract_features_for_response(mock_response_data, mock_sp_data)
    
    # データ検証
    validation = processor.validate_timeseries_data(mock_sp_data)
    
    print("Extracted features:")
    print(json.dumps(features, indent=2, default=str))
    print("\nValidation results:")
    print(json.dumps(validation, indent=2))

if __name__ == '__main__':
    main()
