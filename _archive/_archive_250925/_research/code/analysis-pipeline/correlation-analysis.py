#!/usr/bin/env python3
"""
Spirit in Physics - Correlation Analysis Pipeline
生理・感情相関分析の主要コンポーネント
"""

import pandas as pd
import numpy as np
from scipy import stats
from typing import Dict, List, Tuple, Any
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class CorrelationAnalyzer:
    """生理・感情データの相関分析クラス"""

    def __init__(self):
        self.correlation_methods = ['pearson', 'spearman']
        self.significance_levels = [0.05, 0.01, 0.001]

    def analyze_physio_emotion_correlation(
        self,
        physiological_data: pd.DataFrame,
        emotion_data: pd.DataFrame,
        time_window: int = 30
    ) -> Dict[str, Any]:
        """
        生理データと感情データの包括的相関分析

        Args:
            physiological_data: 生理データ (columns: timestamp, gsr, hrv, scl, ...)
            emotion_data: 感情データ (columns: timestamp, emotion_type, intensity, ...)
            time_window: 時間ウィンドウサイズ (秒)

        Returns:
            相関分析結果の辞書
        """
        logging.info("Starting physiological-emotion correlation analysis")

        # データの時間同期
        synced_data = self._synchronize_time_series(physiological_data, emotion_data)

        analysis_results = {
            'metadata': {
                'analysis_timestamp': datetime.now().isoformat(),
                'physiological_signals': list(physiological_data.columns[1:]),  # timestamp以外
                'emotion_types': emotion_data['emotion_type'].unique().tolist(),
                'time_window_seconds': time_window,
                'total_data_points': len(synced_data)
            },
            'correlation_matrix': {},
            'time_windowed_analysis': {},
            'statistical_tests': {},
            'significant_findings': []
        }

        # 全体相関分析
        analysis_results['correlation_matrix'] = self._compute_correlation_matrix(synced_data)

        # 時間ウィンドウベース分析
        analysis_results['time_windowed_analysis'] = self._time_windowed_correlation_analysis(
            synced_data, time_window
        )

        # 統計的検定
        analysis_results['statistical_tests'] = self._perform_statistical_tests(synced_data)

        # 有意な知見の抽出
        analysis_results['significant_findings'] = self._extract_significant_findings(analysis_results)

        logging.info("Correlation analysis completed")
        return analysis_results

    def _synchronize_time_series(
        self,
        phys_data: pd.DataFrame,
        emotion_data: pd.DataFrame
    ) -> pd.DataFrame:
        """
        生理データと感情データを時間軸で同期
        """
        # タイムスタンプを基準にデータをマージ
        merged_data = pd.merge_asof(
            phys_data.sort_values('timestamp'),
            emotion_data.sort_values('timestamp'),
            on='timestamp',
            tolerance=pd.Timedelta('1s'),  # 1秒以内のデータを同期
            direction='nearest'
        )

        # NaN値を補間
        merged_data = merged_data.interpolate(method='linear', limit_direction='both')

        # 欠損値が多い行を除去
        merged_data = merged_data.dropna(thresh=len(merged_data.columns) * 0.8)

        return merged_data

    def _compute_correlation_matrix(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        相関係数行列を計算
        """
        correlation_matrix = {}

        # 生理指標の列を取得
        phys_columns = [col for col in data.columns if col not in ['timestamp', 'emotion_type']]
        emotion_column = 'intensity'  # 感情強度

        for phys_col in phys_columns:
            if phys_col in data.columns and emotion_column in data.columns:
                # データのクリーニング
                valid_data = data[[phys_col, emotion_column]].dropna()

                if len(valid_data) >= 10:  # 最小サンプル数
                    # Pearson相関
                    pearson_r, pearson_p = stats.pearsonr(valid_data[phys_col], valid_data[emotion_column])

                    # Spearman相関
                    spearman_r, spearman_p = stats.spearmanr(valid_data[phys_col], valid_data[emotion_column])

                    correlation_matrix[phys_col] = {
                        'pearson': {
                            'r': float(pearson_r),
                            'p_value': float(pearson_p),
                            'significant': pearson_p < 0.05
                        },
                        'spearman': {
                            'rho': float(spearman_r),
                            'p_value': float(spearman_p),
                            'significant': spearman_p < 0.05
                        },
                        'sample_size': len(valid_data),
                        'correlation_strength': self._evaluate_correlation_strength(pearson_r, spearman_r)
                    }

        return correlation_matrix

    def _time_windowed_correlation_analysis(
        self,
        data: pd.DataFrame,
        window_size: int
    ) -> Dict[str, Any]:
        """
        時間ウィンドウベースの相関分析
        """
        windowed_results = {
            'window_size': window_size,
            'windows': [],
            'peak_correlations': []
        }

        # データの時間範囲を計算
        data['timestamp'] = pd.to_datetime(data['timestamp'])
        start_time = data['timestamp'].min()
        end_time = data['timestamp'].max()

        # スライディングウィンドウ分析
        current_time = start_time
        window_id = 0

        while current_time + pd.Timedelta(seconds=window_size) <= end_time:
            window_end = current_time + pd.Timedelta(seconds=window_size)

            # ウィンドウ内のデータを抽出
            window_data = data[
                (data['timestamp'] >= current_time) &
                (data['timestamp'] < window_end)
            ]

            if len(window_data) >= 10:  # 十分なデータポイント
                # 相関係数を計算
                phys_columns = [col for col in window_data.columns if col not in ['timestamp', 'emotion_type']]

                window_correlations = {}
                for phys_col in phys_columns:
                    if phys_col in window_data.columns and 'intensity' in window_data.columns:
                        valid_data = window_data[[phys_col, 'intensity']].dropna()
                        if len(valid_data) >= 5:
                            r, p = stats.pearsonr(valid_data[phys_col], valid_data['intensity'])
                            window_correlations[phys_col] = {
                                'r': float(r),
                                'p_value': float(p),
                                'significant': p < 0.05
                            }

                if window_correlations:
                    window_result = {
                        'window_id': window_id,
                        'start_time': current_time.isoformat(),
                        'end_time': window_end.isoformat(),
                        'correlations': window_correlations,
                        'sample_count': len(window_data)
                    }
                    windowed_results['windows'].append(window_result)
                    window_id += 1

            # 次のウィンドウへ (50%オーバーラップ)
            current_time += pd.Timedelta(seconds=window_size // 2)

        # ピーク相関の特定
        if windowed_results['windows']:
            # 各生理指標の最大相関を抽出
            for phys_col in data.columns:
                if phys_col not in ['timestamp', 'emotion_type', 'intensity']:
                    peak_windows = []
                    for window in windowed_results['windows']:
                        if phys_col in window['correlations']:
                            corr_data = window['correlations'][phys_col]
                            if corr_data['significant']:
                                peak_windows.append({
                                    'window_id': window['window_id'],
                                    'correlation': abs(corr_data['r']),
                                    'time_range': f"{window['start_time']} - {window['end_time']}",
                                    'r_value': corr_data['r'],
                                    'p_value': corr_data['p_value']
                                })

                    if peak_windows:
                        # 相関の絶対値でソート
                        peak_windows.sort(key=lambda x: x['correlation'], reverse=True)
                        top_peak = peak_windows[0]

                        windowed_results['peak_correlations'].append({
                            'physiological_signal': phys_col,
                            'peak_correlation': top_peak['correlation'],
                            'r_value': top_peak['r_value'],
                            'time_range': top_peak['time_range'],
                            'window_id': top_peak['window_id']
                        })

        return windowed_results

    def _perform_statistical_tests(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        統計的検定の実行
        """
        tests_results = {}

        # 正規性検定 (Shapiro-Wilk)
        phys_columns = [col for col in data.columns if col not in ['timestamp', 'emotion_type']]

        tests_results['normality_tests'] = {}
        for col in phys_columns:
            if col in data.columns:
                clean_data = data[col].dropna()
                if len(clean_data) >= 3:
                    statistic, p_value = stats.shapiro(clean_data)
                    tests_results['normality_tests'][col] = {
                        'statistic': float(statistic),
                        'p_value': float(p_value),
                        'is_normal': p_value > 0.05,
                        'sample_size': len(clean_data)
                    }

        # 相関の有意性検定 (既に相関係数計算で実施済み)

        # 分散分析 (ANOVA) - 感情タイプによる生理反応の違い
        if 'emotion_type' in data.columns and 'intensity' in data.columns:
            emotion_groups = {}
            for emotion in data['emotion_type'].unique():
                emotion_groups[emotion] = data[data['emotion_type'] == emotion]['intensity'].dropna()

            # 少なくとも2つのグループがあり、各グループに十分なデータがある場合
            valid_groups = {k: v for k, v in emotion_groups.items() if len(v) >= 3}

            if len(valid_groups) >= 2:
                try:
                    f_statistic, p_value = stats.f_oneway(*valid_groups.values())
                    tests_results['anova_test'] = {
                        'f_statistic': float(f_statistic),
                        'p_value': float(p_value),
                        'significant': p_value < 0.05,
                        'groups_tested': list(valid_groups.keys()),
                        'sample_sizes': [len(v) for v in valid_groups.values()]
                    }
                except:
                    tests_results['anova_test'] = {'error': 'ANOVA test failed'}

        return tests_results

    def _evaluate_correlation_strength(self, pearson_r: float, spearman_rho: float) -> str:
        """
        相関の強度を評価
        """
        avg_correlation = (abs(pearson_r) + abs(spearman_rho)) / 2

        if avg_correlation >= 0.8:
            return 'very_strong'
        elif avg_correlation >= 0.6:
            return 'strong'
        elif avg_correlation >= 0.4:
            return 'moderate'
        elif avg_correlation >= 0.2:
            return 'weak'
        else:
            return 'very_weak'

    def _extract_significant_findings(self, analysis_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        分析結果から重要な知見を抽出
        """
        findings = []

        # 相関係数行列からの知見
        correlation_matrix = analysis_results.get('correlation_matrix', {})
        for phys_signal, correlations in correlation_matrix.items():
            pearson = correlations.get('pearson', {})
            spearman = correlations.get('spearman', {})

            if pearson.get('significant') or spearman.get('significant'):
                strength = correlations.get('correlation_strength', 'unknown')

                findings.append({
                    'type': 'correlation',
                    'physiological_signal': phys_signal,
                    'emotion_type': 'overall',  # 感情タイプが指定されていない場合
                    'pearson_r': pearson.get('r', 0),
                    'spearman_rho': spearman.get('rho', 0),
                    'strength': strength,
                    'significance_level': 'high' if strength in ['very_strong', 'strong'] else 'moderate',
                    'sample_size': correlations.get('sample_size', 0)
                })

        # 時間ウィンドウ分析からの知見
        time_analysis = analysis_results.get('time_windowed_analysis', {})
        peak_correlations = time_analysis.get('peak_correlations', [])

        for peak in peak_correlations:
            findings.append({
                'type': 'temporal_pattern',
                'physiological_signal': peak['physiological_signal'],
                'correlation': peak['peak_correlation'],
                'time_range': peak['time_range'],
                'significance_level': 'high' if peak['peak_correlation'] > 0.6 else 'moderate'
            })

        # 統計的検定からの知見
        statistical_tests = analysis_results.get('statistical_tests', {})
        normality_tests = statistical_tests.get('normality_tests', {})

        # 正規分布でない変数の報告
        non_normal_vars = [var for var, test in normality_tests.items() if not test.get('is_normal', True)]
        if non_normal_vars:
            findings.append({
                'type': 'data_distribution',
                'description': f'Non-normal distribution detected in: {", ".join(non_normal_vars)}',
                'significance_level': 'moderate'
            })

        # ANOVA結果
        anova_test = statistical_tests.get('anova_test', {})
        if anova_test.get('significant'):
            findings.append({
                'type': 'group_difference',
                'description': f'Significant differences in emotional responses between groups (F={anova_test.get("f_statistic", 0):.2f}, p={anova_test.get("p_value", 1):.3f})',
                'significance_level': 'high'
            })

        return findings

    def generate_correlation_report(self, analysis_results: Dict[str, Any]) -> str:
        """
        相関分析のレポートを生成
        """
        report_lines = [
            "# Physiological-Emotion Correlation Analysis Report",
            "",
            f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "## Summary",
            ""
        ]

        metadata = analysis_results.get('metadata', {})
        report_lines.extend([
            f"- **Physiological Signals Analyzed**: {len(metadata.get('physiological_signals', []))}",
            f"- **Emotion Types**: {len(metadata.get('emotion_types', []))}",
            f"- **Total Data Points**: {metadata.get('total_data_points', 0)}",
            f"- **Time Window**: {metadata.get('time_window_seconds', 0)} seconds",
            ""
        ])

        # 相関係数行列
        correlation_matrix = analysis_results.get('correlation_matrix', {})
        if correlation_matrix:
            report_lines.extend([
                "## Correlation Matrix Results",
                "",
                "| Physiological Signal | Pearson r | Spearman ρ | Strength | Significant | Sample Size |",
                "|----------------------|-----------|------------|----------|------------|-------------|"
            ])

            for signal, correlations in correlation_matrix.items():
                pearson = correlations.get('pearson', {})
                spearman = correlations.get('spearman', {})
                strength = correlations.get('correlation_strength', 'unknown')

                report_lines.append(
                    f"| {signal} | {pearson.get('r', 0):.3f} | {spearman.get('rho', 0):.3f} | {strength} | {pearson.get('significant', False)} | {correlations.get('sample_size', 0)} |"
                )

            report_lines.append("")

        # 有意な知見
        significant_findings = analysis_results.get('significant_findings', [])
        if significant_findings:
            report_lines.extend([
                "## Significant Findings",
                ""
            ])

            for finding in significant_findings:
                if finding['type'] == 'correlation':
                    report_lines.append(
                        f"- **{finding['significance_level'].upper()}**: {finding['physiological_signal']} shows {finding['strength']} correlation "
                        f"(r={finding['pearson_r']:.3f}, ρ={finding['spearman_rho']:.3f}) with {finding['emotion_type']} "
                        f"(n={finding['sample_size']})"
                    )
                elif finding['type'] == 'temporal_pattern':
                    report_lines.append(
                        f"- **{finding['significance_level'].upper()}**: Peak correlation of {finding['correlation']:.3f} "
                        f"for {finding['physiological_signal']} during {finding['time_range']}"
                    )
                else:
                    report_lines.append(f"- **{finding['significance_level'].upper()}**: {finding['description']}")

            report_lines.append("")

        return "\n".join(report_lines)


def main():
    """メイン実行関数"""
    analyzer = CorrelationAnalyzer()

    # サンプルデータの作成（実際の使用では実際のデータを読み込む）
    np.random.seed(42)

    # サンプル生理データ
    timestamps = pd.date_range('2025-01-01', periods=200, freq='100ms')
    physiological_data = pd.DataFrame({
        'timestamp': timestamps,
        'gsr': np.random.normal(5, 1, 200) + np.sin(np.arange(200) * 0.1) * 2,
        'hrv': np.random.normal(50, 10, 200) - np.sin(np.arange(200) * 0.1) * 5,
        'scl': np.random.normal(3, 0.5, 200) + np.cos(np.arange(200) * 0.05) * 1
    })

    # サンプル感情データ
    emotion_timestamps = timestamps[::2]  # 200ms間隔
    emotion_data = pd.DataFrame({
        'timestamp': emotion_timestamps,
        'emotion_type': np.random.choice(['anger', 'joy', 'fear', 'sadness'], len(emotion_timestamps)),
        'intensity': np.random.beta(2, 5, len(emotion_timestamps))  # 感情強度
    })

    # 相関分析の実行
    results = analyzer.analyze_physio_emotion_correlation(
        physiological_data, emotion_data, time_window=30
    )

    # レポート生成
    report = analyzer.generate_correlation_report(results)

    # ファイルに保存
    with open('correlation_analysis_report.md', 'w', encoding='utf-8') as f:
        f.write(report)

    print("Correlation analysis completed. Report saved to 'correlation_analysis_report.md'")

    # 主要な結果を表示
    print("\nKey Findings:")
    for finding in results['significant_findings'][:5]:  # 最初の5つを表示
        print(f"- {finding['type']}: {finding.get('description', 'N/A')}")


if __name__ == "__main__":
    main()
