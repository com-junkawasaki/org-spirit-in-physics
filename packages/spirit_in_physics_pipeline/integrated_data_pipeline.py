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
from .neo4j_client import Neo4jClient

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class IntegratedDataPipeline:
    """セッション、生理、Hume AIデータを統合した分析パイプライン"""

    def __init__(self, neo4j_config: Dict[str, Any], data_dir: str):
        self.neo4j_config = neo4j_config
        self.data_dir = Path(data_dir)
        self.session_processor = SessionDataProcessor()
        self.data_loader = DataLoader(neo4j_config)
        self.hume_processor = HumeDataProcessor(neo4j_config)
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

        # Humeデータベースの確認（Neo4jから）
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
        """生理データと感情データの詳細相関を分析"""
        correlation_analysis = {
            'physiological_file': physiological_file,
            'correlation_analysis': {},
            'time_windowed_analysis': {},
            'physiological_indicators': {},
            'emotion_categories': {},
            'significant_findings': []
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
                        # 詳細な時系列相関分析を実行
                        session_correlation = self._detailed_correlation_analysis(phys_features, emotion_data, str(session_id))
                        correlation_analysis['correlation_analysis'][str(session_id)] = session_correlation

                        # 時間ウィンドウベースの分析
                        windowed_analysis = self._time_window_correlation_analysis(phys_features, emotion_data, str(session_id))
                        correlation_analysis['time_windowed_analysis'][str(session_id)] = windowed_analysis

            # 生理指標の統計
            correlation_analysis['physiological_indicators'] = self._analyze_physiological_indicators(phys_features)

            # 感情カテゴリの統計
            correlation_analysis['emotion_categories'] = self._analyze_emotion_categories(correlation_analysis['correlation_analysis'])

            # 重要な発見を抽出
            correlation_analysis['significant_findings'] = self._extract_significant_findings(correlation_analysis)

        except Exception as e:
            logging.error(f"Failed to analyze physiological-emotion correlation: {e}")

        return correlation_analysis

    def _detailed_correlation_analysis(self, phys_features: Dict[str, Any], emotion_data: Dict[str, Any], session_id: str) -> Dict[str, Any]:
        """詳細な相関分析を実行"""
        analysis = {
            'session_id': session_id,
            'pearson_correlations': {},
            'spearman_correlations': {},
            'correlation_strength': {},
            'physiological_emotion_pairs': []
        }

        # 生理データポイントを取得
        phys_data_points = phys_features.get('data_points', [])

        # 各感情タイプに対して詳細な相関分析
        for emotion_type, emotion_series in emotion_data.items():
            if emotion_series and isinstance(emotion_series, list):
                emotion_df = pd.DataFrame(emotion_series)

                if not emotion_df.empty and 'timestamp_offset_ms' in emotion_df.columns:
                    # 時間同期されたデータで相関を計算
                    phys_series, emotion_series_aligned = self._align_time_series(phys_data_points, emotion_df)

                    if len(phys_series) > 10 and len(emotion_series_aligned) > 10:  # 十分なデータポイントがある場合
                        # ピアソン相関係数
                        pearson_corr = self._compute_pearson_correlation(phys_series, emotion_series_aligned)
                        analysis['pearson_correlations'][emotion_type] = pearson_corr

                        # スピアマン相関係数（ノンパラメトリック）
                        spearman_corr = self._compute_spearman_correlation(phys_series, emotion_series_aligned)
                        analysis['spearman_correlations'][emotion_type] = spearman_corr

                        # 相関の強度評価
                        strength = self._evaluate_correlation_strength(pearson_corr, spearman_corr)
                        analysis['correlation_strength'][emotion_type] = strength

                        # 有意なペアを記録
                        if abs(pearson_corr) > 0.3:  # 相関が0.3以上
                            analysis['physiological_emotion_pairs'].append({
                                'physiological_indicator': 'gsr',  # 仮定
                                'emotion_type': emotion_type,
                                'pearson_r': pearson_corr,
                                'spearman_rho': spearman_corr,
                                'strength': strength,
                                'data_points': len(phys_series)
                            })

        return analysis

    def _time_window_correlation_analysis(self, phys_features: Dict[str, Any], emotion_data: Dict[str, Any], session_id: str) -> Dict[str, Any]:
        """時間ウィンドウベースの相関分析"""
        window_analysis = {
            'session_id': session_id,
            'window_size_seconds': 30,  # 30秒ウィンドウ
            'sliding_windows': [],
            'peak_correlation_periods': []
        }

        # 生理データポイントを取得
        phys_data_points = phys_features.get('data_points', [])

        # 各感情タイプに対してウィンドウ分析
        for emotion_type, emotion_series in emotion_data.items():
            if emotion_series and isinstance(emotion_series, list):
                emotion_df = pd.DataFrame(emotion_series)

                if not emotion_df.empty and 'timestamp_offset_ms' in emotion_df.columns:
                    windows = self._compute_sliding_window_correlations(phys_data_points, emotion_df, emotion_type)
                    window_analysis['sliding_windows'].extend(windows)

                    # ピーク相関期間を特定
                    peak_periods = self._identify_peak_correlation_periods(windows)
                    window_analysis['peak_correlation_periods'].extend(peak_periods)

        return window_analysis

    def _align_time_series(self, phys_data_points: List[Dict[str, Any]], emotion_df: pd.DataFrame) -> Tuple[List[float], List[float]]:
        """生理データと感情データを時間軸で同期"""
        phys_series = []
        emotion_series = []

        # 生理データのタイムスタンプを取得（ミリ秒）
        phys_timestamps = []
        phys_values = []

        for point in phys_data_points:
            if 'timestamp' in point and 'gsr' in point:  # GSRを主な指標として使用
                phys_timestamps.append(point['timestamp'])
                phys_values.append(point['gsr'])

        # 感情データのタイムスタンプを取得
        emotion_timestamps = emotion_df['timestamp_offset_ms'].tolist()
        emotion_intensities = emotion_df.get('intensity', [0] * len(emotion_df)).tolist()

        # 時間範囲を決定
        if phys_timestamps and emotion_timestamps:
            min_time = max(min(phys_timestamps), min(emotion_timestamps))
            max_time = min(max(phys_timestamps), max(emotion_timestamps))

            # 共通の時間範囲でデータをフィルタリング
            aligned_phys = []
            aligned_emotion = []

            for i, ts in enumerate(phys_timestamps):
                if min_time <= ts <= max_time:
                    aligned_phys.append(phys_values[i])

            for i, ts in enumerate(emotion_timestamps):
                if min_time <= ts <= max_time:
                    aligned_emotion.append(emotion_intensities[i])

            # 同じ長さに調整（最小長に合わせる）
            min_length = min(len(aligned_phys), len(aligned_emotion))
            return aligned_phys[:min_length], aligned_emotion[:min_length]

        return [], []

    def _compute_pearson_correlation(self, x: List[float], y: List[float]) -> float:
        """ピアソン相関係数を計算"""
        if len(x) != len(y) or len(x) < 2:
            return 0.0

        try:
            return pd.Series(x).corr(pd.Series(y), method='pearson')
        except:
            return 0.0

    def _compute_spearman_correlation(self, x: List[float], y: List[float]) -> float:
        """スピアマン相関係数を計算（ノンパラメトリック）"""
        if len(x) != len(y) or len(x) < 2:
            return 0.0

        try:
            return pd.Series(x).corr(pd.Series(y), method='spearman')
        except:
            return 0.0

    def _evaluate_correlation_strength(self, pearson_r: float, spearman_rho: float) -> str:
        """相関の強度を評価"""
        avg_corr = (abs(pearson_r) + abs(spearman_rho)) / 2

        if avg_corr >= 0.8:
            return 'very_strong'
        elif avg_corr >= 0.6:
            return 'strong'
        elif avg_corr >= 0.4:
            return 'moderate'
        elif avg_corr >= 0.2:
            return 'weak'
        else:
            return 'very_weak'

    def _compute_sliding_window_correlations(self, phys_data_points: List[Dict[str, Any]], emotion_df: pd.DataFrame, emotion_type: str) -> List[Dict[str, Any]]:
        """スライディングウィンドウで相関係数を計算"""
        windows = []
        window_size_ms = 30 * 1000  # 30秒

        # 生理データと感情データを時間同期
        phys_series, emotion_series = self._align_time_series(phys_data_points, emotion_df)

        if len(phys_series) < 10 or len(emotion_series) < 10:
            return windows

        # スライディングウィンドウ分析
        step_size = 5 * 1000  # 5秒ステップ
        for start_time in range(0, len(phys_series) * 100, step_size):  # 仮定の時間間隔
            end_time = start_time + window_size_ms

            # ウィンドウ内のデータを抽出
            window_phys = []
            window_emotion = []

            for i, (phys_val, emotion_val) in enumerate(zip(phys_series, emotion_series)):
                # 簡易的な時間ベースのフィルタリング
                if len(window_phys) < 30:  # ウィンドウサイズを30サンプルに制限
                    window_phys.append(phys_val)
                    window_emotion.append(emotion_val)

            if len(window_phys) >= 5:  # 最小5サンプル
                correlation = self._compute_pearson_correlation(window_phys, window_emotion)
                if not pd.isna(correlation):
                    windows.append({
                        'emotion_type': emotion_type,
                        'window_start_ms': start_time,
                        'window_end_ms': end_time,
                        'correlation': correlation,
                        'sample_count': len(window_phys)
                    })

        return windows

    def _identify_peak_correlation_periods(self, windows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """ピーク相関期間を特定"""
        peak_periods = []

        if not windows:
            return peak_periods

        # 相関の絶対値でソート
        sorted_windows = sorted(windows, key=lambda x: abs(x['correlation']), reverse=True)

        # 上位3つのピーク期間を抽出
        for i, window in enumerate(sorted_windows[:3]):
            if abs(window['correlation']) > 0.4:  # 相関が0.4以上の場合のみ
                peak_periods.append({
                    'rank': i + 1,
                    'emotion_type': window['emotion_type'],
                    'correlation': window['correlation'],
                    'time_period': f"{window['window_start_ms']/1000:.1f}s - {window['window_end_ms']/1000:.1f}s",
                    'sample_count': window['sample_count']
                })

        return peak_periods

    def _analyze_physiological_indicators(self, phys_features: Dict[str, Any]) -> Dict[str, Any]:
        """生理指標の統計分析"""
        phys_data_points = phys_features.get('data_points', [])

        analysis = {
            'total_samples': len(phys_data_points),
            'indicators': {},
            'variability': {},
            'time_series_stats': {}
        }

        if not phys_data_points:
            return analysis

        # 利用可能な生理指標を収集
        available_indicators = set()
        for point in phys_data_points:
            available_indicators.update(point.keys())

        # タイムスタンプ以外の指標を分析
        indicators_to_analyze = [ind for ind in available_indicators if ind != 'timestamp']

        for indicator in indicators_to_analyze:
            values = [point.get(indicator, 0) for point in phys_data_points if indicator in point]
            if values:
                values_series = pd.Series(values)
                analysis['indicators'][indicator] = {
                    'mean': float(values_series.mean()),
                    'std': float(values_series.std()),
                    'min': float(values_series.min()),
                    'max': float(values_series.max()),
                    'median': float(values_series.median()),
                    'count': len(values)
                }

                # 変動性分析
                if len(values) > 1:
                    analysis['variability'][indicator] = {
                        'coefficient_of_variation': float(values_series.std() / values_series.mean()) if values_series.mean() != 0 else 0,
                        'range': float(values_series.max() - values_series.min()),
                        'iqr': float(values_series.quantile(0.75) - values_series.quantile(0.25))
                    }

        # 時系列統計
        if phys_data_points:
            timestamps = [point.get('timestamp', 0) for point in phys_data_points]
            analysis['time_series_stats'] = {
                'duration_ms': max(timestamps) - min(timestamps) if timestamps else 0,
                'sampling_rate_hz': len(timestamps) / ((max(timestamps) - min(timestamps)) / 1000) if timestamps and (max(timestamps) - min(timestamps)) > 0 else 0
            }

        return analysis

    def _analyze_emotion_categories(self, correlation_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """感情カテゴリの統計分析"""
        emotion_stats = {
            'total_sessions': len(correlation_analysis),
            'emotion_types_analyzed': set(),
            'correlation_distribution': {
                'very_strong': 0,
                'strong': 0,
                'moderate': 0,
                'weak': 0,
                'very_weak': 0
            },
            'top_correlations': [],
            'emotion_category_summary': {}
        }

        all_pairs = []
        for session_data in correlation_analysis.values():
            if 'physiological_emotion_pairs' in session_data:
                all_pairs.extend(session_data['physiological_emotion_pairs'])
                for pair in session_data['physiological_emotion_pairs']:
                    emotion_stats['emotion_types_analyzed'].add(pair['emotion_type'])
                    emotion_stats['correlation_distribution'][pair['strength']] += 1

        # 相関の強度でソートしてトップ相関を取得
        sorted_pairs = sorted(all_pairs, key=lambda x: abs(x['pearson_r']), reverse=True)
        emotion_stats['top_correlations'] = sorted_pairs[:10]  # トップ10

        # 感情タイプごとのサマリー
        emotion_summary = {}
        for pair in all_pairs:
            emotion_type = pair['emotion_type']
            if emotion_type not in emotion_summary:
                emotion_summary[emotion_type] = {
                    'pair_count': 0,
                    'avg_pearson': 0,
                    'avg_spearman': 0,
                    'strength_distribution': {'very_strong': 0, 'strong': 0, 'moderate': 0, 'weak': 0, 'very_weak': 0}
                }

            emotion_summary[emotion_type]['pair_count'] += 1
            emotion_summary[emotion_type]['avg_pearson'] += pair['pearson_r']
            emotion_summary[emotion_type]['avg_spearman'] += pair['spearman_rho']
            emotion_summary[emotion_type]['strength_distribution'][pair['strength']] += 1

        # 平均を計算
        for emotion_type, stats in emotion_summary.items():
            if stats['pair_count'] > 0:
                stats['avg_pearson'] /= stats['pair_count']
                stats['avg_spearman'] /= stats['pair_count']

        emotion_stats['emotion_category_summary'] = emotion_summary
        emotion_stats['emotion_types_analyzed'] = list(emotion_stats['emotion_types_analyzed'])

        return emotion_stats

    def _extract_significant_findings(self, correlation_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """相関分析から重要な発見を抽出"""
        findings = []

        # 生理・感情ペアの分析
        phys_emotion_pairs = correlation_analysis.get('physiological_emotion_pairs', {})
        all_pairs = []
        for session_pairs in phys_emotion_pairs.values():
            all_pairs.extend(session_pairs)

        if all_pairs:
            # 最も強い相関を持つペア
            strongest_pairs = sorted(all_pairs, key=lambda x: abs(x['pearson_r']), reverse=True)[:3]
            for i, pair in enumerate(strongest_pairs):
                findings.append({
                    'type': 'strong_correlation',
                    'rank': i + 1,
                    'description': f"{pair['physiological_indicator']} と {pair['emotion_type']} の相関 (r={pair['pearson_r']:.3f})",
                    'significance': 'high' if abs(pair['pearson_r']) > 0.6 else 'moderate',
                    'data_points': pair['data_points']
                })

        # 感情カテゴリの分析
        emotion_stats = correlation_analysis.get('emotion_categories', {})
        correlation_dist = emotion_stats.get('correlation_distribution', {})

        if correlation_dist.get('very_strong', 0) > 0:
            findings.append({
                'type': 'correlation_pattern',
                'description': f"{correlation_dist['very_strong']} つの非常に強い相関関係を検出",
                'significance': 'high'
            })

        # 時間ウィンドウ分析
        time_analysis = correlation_analysis.get('time_windowed_analysis', {})
        peak_periods = []
        for session_windows in time_analysis.values():
            peak_periods.extend(session_windows.get('peak_correlation_periods', []))

        if peak_periods:
            top_peak = max(peak_periods, key=lambda x: abs(x['correlation']))
            findings.append({
                'type': 'temporal_pattern',
                'description': f"時間帯 {top_peak['time_period']} に最も強い相関 (r={top_peak['correlation']:.3f}) を検出",
                'significance': 'moderate'
            })

        return findings

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

    def export_analysis_report(self, participant_id: str, output_path: Optional[str] = None, format: str = 'json') -> str:
        """詳細な分析レポートをエクスポート"""
        analysis = self.create_integrated_timeline_analysis(participant_id)

        if output_path is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_path = f"integrated_analysis_{participant_id}_{timestamp}.{format}"

        if format.lower() == 'json':
            self._export_json_report(analysis, output_path)
        elif format.lower() == 'markdown':
            self._export_markdown_report(analysis, output_path, participant_id)
        elif format.lower() == 'html':
            self._export_html_report(analysis, output_path, participant_id)
        else:
            # デフォルトはJSON
            self._export_json_report(analysis, output_path)

        logging.info(f"Analysis report exported to {output_path}")
        return output_path

    def _export_json_report(self, analysis: Dict[str, Any], output_path: str) -> None:
        """JSON形式でレポートをエクスポート"""
        # 分析結果をより構造化
        structured_report = {
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'participant_id': analysis.get('participant_id'),
                'report_version': '2.0',
                'analysis_type': 'integrated_timeline_analysis'
            },
            'executive_summary': self._generate_executive_summary(analysis),
            'data_quality_assessment': analysis.get('data_completeness', {}),
            'session_timelines': analysis.get('session_timelines', []),
            'physiological_emotion_correlations': analysis.get('physiological_correlations', []),
            'integrated_insights': analysis.get('integrated_insights', {}),
            'detailed_analysis': analysis
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(structured_report, f, ensure_ascii=False, indent=2, default=str)

    def _export_markdown_report(self, analysis: Dict[str, Any], output_path: str, participant_id: str) -> None:
        """Markdown形式でレポートをエクスポート"""
        report_lines = [
            f"# 統合時系列分析レポート\n",
            f"**参加者ID**: {participant_id}\n",
            f"**生成日時**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n",
            f"**レポートバージョン**: 2.0\n\n"
        ]

        # エグゼクティブサマリー
        exec_summary = self._generate_executive_summary(analysis)
        report_lines.extend([
            "## エグゼクティブサマリー\n",
            f"{exec_summary}\n\n"
        ])

        # データ品質評価
        completeness = analysis.get('data_completeness', {})
        report_lines.extend([
            "## データ品質評価\n",
            f"- **総合品質スコア**: {completeness.get('comprehensive_quality_score', 0)}/100\n",
            f"- **同意書**: {'✓' if completeness.get('has_consent') else '✗'}\n",
            f"- **セッションデータ**: {'✓' if completeness.get('has_session_data') else '✗'}\n",
            f"- **ビデオファイル**: {'✓' if completeness.get('has_video_files') else '✗'}\n",
            f"- **生理データ**: {'✓' if completeness.get('has_physiological_data') else '✗'}\n",
            f"- **Hume AIデータ**: {'✓' if completeness.get('has_hume_data_db') else '✗'}\n\n"
        ])

        # セッション分析
        session_timelines = analysis.get('session_timelines', [])
        if session_timelines:
            report_lines.append("## セッション時系列分析\n")
            for i, session in enumerate(session_timelines):
                session_info = session.get('session_info', {})
                report_lines.extend([
                    f"### セッション {i+1}\n",
                    f"- **イベント数**: {session_info.get('total_events', 0)}\n",
                    f"- **単語数**: {session_info.get('word_count', 0)}\n",
                    f"- **セッション時間**: {session_info.get('duration_ms', 0) / 1000:.1f}秒\n",
                    f"- **平均応答時間**: {session_info.get('avg_response_time_ms', 0):.0f}ms\n\n"
                ])

        # 生理・感情相関分析
        correlations = analysis.get('physiological_correlations', [])
        if correlations:
            report_lines.append("## 生理・感情相関分析\n")
            for correlation in correlations:
                significant_findings = correlation.get('significant_findings', [])
                if significant_findings:
                    report_lines.append("### 重要な発見\n")
                    for finding in significant_findings:
                        report_lines.append(f"- {finding.get('description', '')}\n")
                    report_lines.append("\n")

        # 統合インサイト
        insights = analysis.get('integrated_insights', {})
        if insights:
            report_lines.extend([
                "## 統合インサイト\n",
                f"**データ品質評価**: {insights.get('data_quality_assessment', '')}\n\n"
            ])

            key_findings = insights.get('key_findings', [])
            if key_findings:
                report_lines.append("### 主要な発見\n")
                for finding in key_findings:
                    report_lines.append(f"- {finding}\n")
                report_lines.append("\n")

            recommendations = insights.get('recommendations', [])
            if recommendations:
                report_lines.append("### 推奨事項\n")
                for rec in recommendations:
                    report_lines.append(f"- {rec}\n")
                report_lines.append("\n")

        with open(output_path, 'w', encoding='utf-8') as f:
            f.writelines(report_lines)

    def _export_html_report(self, analysis: Dict[str, Any], output_path: str, participant_id: str) -> None:
        """HTML形式でレポートをエクスポート"""
        html_content = f"""
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>統合時系列分析レポート - {participant_id}</title>
    <style>
        body {{ font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .header {{ text-align: center; border-bottom: 2px solid #007acc; padding-bottom: 20px; margin-bottom: 30px; }}
        .section {{ margin-bottom: 30px; }}
        .metric {{ display: inline-block; background: #f0f8ff; padding: 10px 20px; margin: 5px; border-radius: 5px; border-left: 4px solid #007acc; }}
        .score {{ font-size: 2em; font-weight: bold; color: #007acc; }}
        .good {{ color: #28a745; }}
        .warning {{ color: #ffc107; }}
        .danger {{ color: #dc3545; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
        th {{ background-color: #f8f9fa; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>統合時系列分析レポート</h1>
            <p><strong>参加者ID:</strong> {participant_id}</p>
            <p><strong>生成日時:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
"""

        # エグゼクティブサマリー
        exec_summary = self._generate_executive_summary(analysis)
        html_content += f"""
        <div class="section">
            <h2>エグゼクティブサマリー</h2>
            <p>{exec_summary}</p>
        </div>
"""

        # データ品質評価
        completeness = analysis.get('data_completeness', {})
        score = completeness.get('comprehensive_quality_score', 0)
        score_class = 'good' if score >= 80 else 'warning' if score >= 60 else 'danger'

        html_content += f"""
        <div class="section">
            <h2>データ品質評価</h2>
            <div class="metric">
                <span class="score {score_class}">{score}/100</span>
                <br>総合品質スコア
            </div>
            <table>
                <tr><th>データタイプ</th><th>状態</th></tr>
                <tr><td>同意書</td><td>{"✓ 利用可能" if completeness.get('has_consent') else "✗ 利用不可"}</td></tr>
                <tr><td>セッションデータ</td><td>{"✓ 利用可能" if completeness.get('has_session_data') else "✗ 利用不可"}</td></tr>
                <tr><td>ビデオファイル</td><td>{"✓ 利用可能" if completeness.get('has_video_files') else "✗ 利用不可"}</td></tr>
                <tr><td>生理データ</td><td>{"✓ 利用可能" if completeness.get('has_physiological_data') else "✗ 利用不可"}</td></tr>
                <tr><td>Hume AIデータ</td><td>{"✓ 利用可能" if completeness.get('has_hume_data_db') else "✗ 利用不可"}</td></tr>
            </table>
        </div>
"""

        # セッション分析
        session_timelines = analysis.get('session_timelines', [])
        if session_timelines:
            html_content += """
        <div class="section">
            <h2>セッション時系列分析</h2>
            <table>
                <tr><th>セッション</th><th>イベント数</th><th>単語数</th><th>時間</th><th>平均応答時間</th></tr>
"""

            for i, session in enumerate(session_timelines):
                session_info = session.get('session_info', {})
                html_content += f"""
                <tr>
                    <td>{i+1}</td>
                    <td>{session_info.get('total_events', 0)}</td>
                    <td>{session_info.get('word_count', 0)}</td>
                    <td>{session_info.get('duration_ms', 0) / 1000:.1f}秒</td>
                    <td>{session_info.get('avg_response_time_ms', 0):.0f}ms</td>
                </tr>
"""

            html_content += "            </table>\n        </div>"

        # 統合インサイト
        insights = analysis.get('integrated_insights', {})
        if insights:
            html_content += f"""
        <div class="section">
            <h2>統合インサイト</h2>
            <h3>データ品質評価</h3>
            <p>{insights.get('data_quality_assessment', '')}</p>
"""

            key_findings = insights.get('key_findings', [])
            if key_findings:
                html_content += "<h3>主要な発見</h3><ul>"
                for finding in key_findings:
                    html_content += f"<li>{finding}</li>"
                html_content += "</ul>"

            recommendations = insights.get('recommendations', [])
            if recommendations:
                html_content += "<h3>推奨事項</h3><ul>"
                for rec in recommendations:
                    html_content += f"<li>{rec}</li>"
                html_content += "</ul>"

            html_content += "        </div>"

        html_content += """
    </div>
</body>
</html>
"""

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)

    def _generate_executive_summary(self, analysis: Dict[str, Any]) -> str:
        """エグゼクティブサマリーを生成"""
        participant_id = analysis.get('participant_id', 'Unknown')
        completeness = analysis.get('data_completeness', {})
        session_timelines = analysis.get('session_timelines', [])

        summary_parts = [
            f"参加者 {participant_id} の統合時系列分析レポートです。",
            f"データ品質スコアは {completeness.get('comprehensive_quality_score', 0)}/100 です。"
        ]

        if session_timelines:
            total_words = sum(s.get('session_info', {}).get('word_count', 0) for s in session_timelines)
            avg_response_time = sum(s.get('session_info', {}).get('avg_response_time_ms', 0) for s in session_timelines) / len(session_timelines)
            summary_parts.append(f"合計 {len(session_timelines)} セッションで {total_words} 語を分析し、平均応答時間は {avg_response_time:.0f}ms でした。")

        correlations = analysis.get('physiological_correlations', [])
        if correlations:
            summary_parts.append(f"生理データとの相関分析により、感情と生理反応の関係性を評価しました。")

        return " ".join(summary_parts)
