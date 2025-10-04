#!/usr/bin/env python3
"""
統合データパイプライン - セッションデータ、生理データ、Hume AIデータを統合した分析システム
"""

import logging
import pandas as pd
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import json

from .session_data_processor import SessionDataProcessor
from .data_loader import DataLoader
from .hume_data_processor import HumeDataProcessor
from .physiological_processor import PhysiologicalProcessor

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class IntegratedDataPipeline:
    """セッション、生理、Hume AIデータを統合した分析パイプライン"""

    def __init__(self, supabase_config: Dict[str, Any], data_dir: str):
        self.supabase_config = supabase_config
        self.data_dir = Path(data_dir)
        self.session_processor = SessionDataProcessor()
        self.data_loader = DataLoader(supabase_config)
        self.hume_processor = HumeDataProcessor(supabase_config)
        self.physiological_processor = PhysiologicalProcessor()

    def analyze_participant_completeness(self, participant_id: str) -> Dict[str, Any]:
        """参加者のデータ完全性を包括的に分析"""
        completeness = self.session_processor.analyze_data_completeness(participant_id, self.data_dir)

        # 追加のデータ完全性チェック
        participant_path = self.data_dir / participant_id

        # 生理データの確認
        physiological_files = list(participant_path.glob('*.CSV'))
        completeness['has_physiological_data'] = len(physiological_files) > 0
        completeness['physiological_file_count'] = len(physiological_files)

        # Humeデータベースの確認（Supabaseから）
        try:
            # 参加者の実験セッションを取得
            sessions = self.data_loader.get_participant_sessions(participant_id)
            completeness['session_count_db'] = len(sessions)

            hume_data_count = 0
            for session in sessions:
                session_id = session.get('id')
                if session_id:
                    hume_data = self.hume_processor.process_hume_data_for_session(str(session_id))
                    if hume_data and any(data for data in hume_data.values()):
                        hume_data_count += 1

            completeness['has_hume_data_db'] = hume_data_count > 0
            completeness['sessions_with_hume_data'] = hume_data_count

        except Exception as e:
            logging.warning(f"Failed to check Hume data for participant {participant_id}: {e}")
            completeness['has_hume_data_db'] = False
            completeness['sessions_with_hume_data'] = 0

        # 全体品質スコアの再計算（生理データ・Hume DBデータを追加）
        quality_score = 0
        if completeness['has_consent']: quality_score += 15
        if completeness['has_session_data']: quality_score += 20
        if completeness['has_video_files']: quality_score += 15
        if completeness['has_hume_data']: quality_score += 15
        if completeness['has_physiological_data']: quality_score += 20
        if completeness['has_hume_data_db']: quality_score += 15

        completeness['comprehensive_quality_score'] = quality_score

        return completeness

    def create_integrated_timeline_analysis(self, participant_id: str) -> Dict[str, Any]:
        """参加者の統合時系列分析を作成"""
        analysis = {
            'participant_id': participant_id,
            'data_completeness': {},
            'session_timelines': [],
            'physiological_correlations': [],
            'emotion_timeline_analysis': {},
            'integrated_insights': {}
        }

        # データ完全性の分析
        analysis['data_completeness'] = self.analyze_participant_completeness(participant_id)

        participant_path = self.data_dir / participant_id

        # セッションごとの時系列分析
        session_files = list(participant_path.glob('session_data.json'))
        for session_file in session_files:
            try:
                viz_data = self.session_processor.create_visualization_data(str(session_file))
                analysis['session_timelines'].append(viz_data)
            except Exception as e:
                logging.error(f"Failed to process session file {session_file}: {e}")

        # 生理データと感情データの相関分析
        physiological_files = list(participant_path.glob('*.CSV'))
        for phys_file in physiological_files:
            try:
                correlations = self._analyze_physiological_emotion_correlation(participant_id, str(phys_file))
                analysis['physiological_correlations'].append(correlations)
            except Exception as e:
                logging.error(f"Failed to analyze physiological correlations for {phys_file}: {e}")

        # 統合インサイトの生成
        analysis['integrated_insights'] = self._generate_integrated_insights(analysis)

        return analysis

    def _analyze_physiological_emotion_correlation(self, participant_id: str, physiological_file: str) -> Dict[str, Any]:
        """生理データと感情データの相関を分析"""
        correlation_analysis = {
            'physiological_file': physiological_file,
            'correlation_coefficients': {},
            'time_aligned_emotions': {},
            'significant_correlations': []
        }

        try:
            # 生理データを処理
            phys_features = self.physiological_processor.process_physiological_data(physiological_file)

            # 参加者の感情データを取得
            sessions = self.data_loader.get_participant_sessions(participant_id)
            for session in sessions:
                session_id = session.get('id')
                if session_id:
                    emotion_data = self.hume_processor.process_hume_data_for_session(str(session_id))
                    if emotion_data:
                        # 時系列での相関を計算
                        correlation_analysis['correlation_coefficients'][str(session_id)] = self._calculate_correlations(phys_features, emotion_data)

        except Exception as e:
            logging.error(f"Failed to analyze physiological-emotion correlation: {e}")

        return correlation_analysis

    def _calculate_correlations(self, phys_features: Dict[str, Any], emotion_data: Dict[str, Any]) -> Dict[str, float]:
        """生理特徴量と感情データの相関係数を計算"""
        correlations = {}

        # 生理データポイントを取得
        phys_data_points = phys_features.get('data_points', [])

        # 感情データタイプごとに相関を計算
        for emotion_type, emotion_series in emotion_data.items():
            if emotion_series:
                emotion_df = pd.DataFrame(emotion_series)

                # 時間軸でアライメント（簡易版）
                # 本来はより精密な時間同期が必要
                if not emotion_df.empty and 'timestamp_offset_ms' in emotion_df.columns:
                    correlations[emotion_type] = self._compute_correlation_with_physiology(phys_data_points, emotion_df)

        return correlations

    def _compute_correlation_with_physiology(self, phys_data_points: List[Dict[str, Any]], emotion_df: pd.DataFrame) -> float:
        """生理データと感情データの相関係数を計算"""
        # 簡易実装：平均相関係数を返す
        # 本実装ではより詳細な時間同期と相関分析が必要
        if not phys_data_points or emotion_df.empty:
            return 0.0

        # 感情強度の時系列変化を計算
        emotion_intensity = emotion_df.get('intensity', pd.Series([0] * len(emotion_df)))

        # 生理データの変化率を計算（例: GSRの変化）
        phys_values = [p.get('gsr', 0) for p in phys_data_points[:len(emotion_intensity)]]

        if len(phys_values) != len(emotion_intensity):
            return 0.0

        try:
            correlation = pd.Series(phys_values).corr(pd.Series(emotion_intensity))
            return correlation if not pd.isna(correlation) else 0.0
        except:
            return 0.0

    def _generate_integrated_insights(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """統合分析から洞察を生成"""
        insights = {
            'data_quality_assessment': '',
            'key_findings': [],
            'recommendations': [],
            'research_opportunities': []
        }

        completeness = analysis.get('data_completeness', {})
        quality_score = completeness.get('comprehensive_quality_score', 0)

        # データ品質評価
        if quality_score >= 80:
            insights['data_quality_assessment'] = '高品質 - 包括的な分析が可能'
        elif quality_score >= 60:
            insights['data_quality_assessment'] = '中品質 - 部分的な分析が可能'
        else:
            insights['data_quality_assessment'] = '低品質 - データ補完が必要'

        # 主要な発見
        session_timelines = analysis.get('session_timelines', [])
        if session_timelines:
            total_words = sum(s.get('session_info', {}).get('word_count', 0) for s in session_timelines)
            insights['key_findings'].append(f'総単語数: {total_words}')

        physiological_correlations = analysis.get('physiological_correlations', [])
        if physiological_correlations:
            insights['key_findings'].append(f'生理データファイル数: {len(physiological_correlations)}')

        # 推奨事項
        if not completeness.get('has_hume_data_db', False):
            insights['recommendations'].append('Hume AI感情分析データの取得を推奨')

        if not completeness.get('has_physiological_data', False):
            insights['recommendations'].append('生理データの取得を推奨')

        # 研究機会
        if quality_score >= 80:
            insights['research_opportunities'].append('多角的データ統合分析が可能')
            insights['research_opportunities'].append('時系列パターン分析の実施推奨')

        return insights

    def export_analysis_report(self, participant_id: str, output_path: Optional[str] = None) -> str:
        """分析レポートをエクスポート"""
        analysis = self.create_integrated_timeline_analysis(participant_id)

        if output_path is None:
            output_path = f"integrated_analysis_{participant_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(analysis, f, ensure_ascii=False, indent=2, default=str)

        logging.info(f"Analysis report exported to {output_path}")
        return output_path
