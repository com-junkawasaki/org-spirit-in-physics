#!/usr/bin/env python3
"""
TensorFlow Projector用データエクスポートツール
Word2Vec埋め込み、生理データ、感情データを高次元可視化用に変換
"""

import pandas as pd
import numpy as np
import json
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class TensorFlowProjectorExporter:
    """TensorFlow Projector向けデータエクスポートクラス"""

    def __init__(self, output_dir: str = "tensorflow-projector-data"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

    def export_word_embeddings(self, word_data: Dict[str, Any]) -> Dict[str, str]:
        """
        Word2Vec埋め込みをTensorFlow Projector形式でエクスポート

        Args:
            word_data: 単語とその埋め込みベクトルの辞書

        Returns:
            エクスポートされたファイルパスの辞書
        """
        logging.info("Exporting word embeddings for TensorFlow Projector")

        # ベクトルデータを準備
        vectors = []
        metadata = []

        for word, embedding in word_data.items():
            if isinstance(embedding, (list, np.ndarray)):
                # ベクトルをタブ区切りで結合
                vector_str = '\t'.join([f"{x:.6f}" for x in embedding])
                vectors.append(vector_str)
                metadata.append(word)

        # TSVファイルに書き出し
        vectors_file = self.output_dir / "word_embeddings_vectors.tsv"
        metadata_file = self.output_dir / "word_embeddings_metadata.tsv"

        # ベクトルファイル（ヘッダーなし）
        with open(vectors_file, 'w', encoding='utf-8') as f:
            for vector in vectors:
                f.write(f"{vector}\n")

        # メタデータファイル（ヘッダー付き）
        with open(metadata_file, 'w', encoding='utf-8') as f:
            f.write("word\n")  # ヘッダー
            for word in metadata:
                f.write(f"{word}\n")

        logging.info(f"Exported {len(vectors)} word embeddings")
        return {
            'vectors': str(vectors_file),
            'metadata': str(metadata_file)
        }

    def export_emotion_patterns(self, emotion_data: List[Dict[str, Any]]) -> Dict[str, str]:
        """
        感情パターンデータをTensorFlow Projector形式でエクスポート

        Args:
            emotion_data: 感情データポイントのリスト
                各要素: {'timestamp': float, 'emotion_type': str, 'intensity': float, ...}

        Returns:
            エクスポートされたファイルパスの辞書
        """
        logging.info("Exporting emotion patterns for TensorFlow Projector")

        # 感情タイプを数値ベクトルに変換
        emotion_types = ['anger', 'joy', 'fear', 'sadness', 'surprise', 'neutral']
        emotion_vectors = []
        metadata = []

        for data_point in emotion_data:
            # 感情タイプをone-hotベクトルに変換
            emotion_type = data_point.get('emotion_type', 'neutral')
            intensity = data_point.get('intensity', 0.5)

            # 基本感情ベクトル
            vector = [0.0] * len(emotion_types)
            if emotion_type in emotion_types:
                idx = emotion_types.index(emotion_type)
                vector[idx] = intensity

            # 追加の感情特徴（利用可能な場合）
            if 'valence' in data_point:
                vector.append(data_point['valence'])
            if 'arousal' in data_point:
                vector.append(data_point['arousal'])

            emotion_vectors.append('\t'.join([f"{x:.6f}" for x in vector]))

            # メタデータ
            metadata.append({
                'emotion_type': emotion_type,
                'intensity': intensity,
                'timestamp': data_point.get('timestamp', 0),
                'participant_id': data_point.get('participant_id', 'unknown')
            })

        # ベクトルファイル
        vectors_file = self.output_dir / "emotion_patterns_vectors.tsv"
        with open(vectors_file, 'w', encoding='utf-8') as f:
            for vector in emotion_vectors:
                f.write(f"{vector}\n")

        # メタデータファイル
        metadata_file = self.output_dir / "emotion_patterns_metadata.tsv"
        with open(metadata_file, 'w', encoding='utf-8') as f:
            f.write("emotion_type\tintensity\ttimestamp\tparticipant_id\n")  # ヘッダー
            for meta in metadata:
                f.write(f"{meta['emotion_type']}\t{meta['intensity']:.3f}\t{meta['timestamp']}\t{meta['participant_id']}\n")

        logging.info(f"Exported {len(emotion_vectors)} emotion patterns")
        return {
            'vectors': str(vectors_file),
            'metadata': str(metadata_file)
        }

    def export_participant_features(self, participant_data: List[Dict[str, Any]]) -> Dict[str, str]:
        """
        参加者特徴データをTensorFlow Projector形式でエクスポート

        Args:
            participant_data: 参加者データのリスト
                各要素: {'id': str, 'features': dict, 'metrics': dict}

        Returns:
            エクスポートされたファイルパスの辞書
        """
        logging.info("Exporting participant features for TensorFlow Projector")

        vectors = []
        metadata = []

        for participant in participant_data:
            features = participant.get('features', {})
            metrics = participant.get('metrics', {})

            # 特徴ベクトルの作成
            feature_vector = []

            # Spirit確率
            feature_vector.append(metrics.get('spirit_probability', 0.5))

            # 相関係数
            feature_vector.append(metrics.get('gsr_anger_correlation', 0.0))
            feature_vector.append(metrics.get('gsr_joy_correlation', 0.0))
            feature_vector.append(metrics.get('hrv_sadness_correlation', 0.0))

            # 反応時間
            feature_vector.append(metrics.get('avg_reaction_time', 2.5))

            # データ品質スコア
            feature_vector.append(metrics.get('data_quality_score', 70.0) / 100.0)

            vectors.append('\t'.join([f"{x:.6f}" for x in feature_vector]))

            # メタデータ
            metadata.append({
                'participant_id': participant['id'],
                'spirit_probability': metrics.get('spirit_probability', 0.5),
                'data_quality': metrics.get('data_quality_score', 70),
                'session_count': metrics.get('session_count', 1)
            })

        # ベクトルファイル
        vectors_file = self.output_dir / "participant_features_vectors.tsv"
        with open(vectors_file, 'w', encoding='utf-8') as f:
            for vector in vectors:
                f.write(f"{vector}\n")

        # メタデータファイル
        metadata_file = self.output_dir / "participant_features_metadata.tsv"
        with open(metadata_file, 'w', encoding='utf-8') as f:
            f.write("participant_id\tspirit_probability\tdata_quality\tsession_count\n")
            for meta in metadata:
                f.write(f"{meta['participant_id']}\t{meta['spirit_probability']:.3f}\t{meta['data_quality']}\t{meta['session_count']}\n")

        logging.info(f"Exported {len(vectors)} participant feature vectors")
        return {
            'vectors': str(vectors_file),
            'metadata': str(metadata_file)
        }

    def export_physiological_timeseries(self, physiological_data: List[Dict[str, Any]], window_size: int = 30) -> Dict[str, str]:
        """
        生理データ時系列をTensorFlow Projector形式でエクスポート

        Args:
            physiological_data: 生理データポイントのリスト
            window_size: ウィンドウサイズ（秒）

        Returns:
            エクスポートされたファイルパスの辞書
        """
        logging.info("Exporting physiological time-series for TensorFlow Projector")

        # 時系列データをウィンドウ化して特徴ベクトルに変換
        windows = []
        metadata = []

        # データを時間順にソート
        sorted_data = sorted(physiological_data, key=lambda x: x.get('timestamp', 0))

        # スライディングウィンドウで特徴抽出
        step_size = window_size // 2  # 50%オーバーラップ

        for i in range(0, len(sorted_data) - window_size, step_size):
            window_data = sorted_data[i:i + window_size]

            # ウィンドウ内の統計特徴を計算
            gsr_values = [p.get('gsr', 0) for p in window_data if 'gsr' in p]
            hrv_values = [p.get('hrv', 0) for p in window_data if 'hrv' in p]
            scl_values = [p.get('scl', 0) for p in window_data if 'scl' in p]

            if gsr_values and hrv_values and scl_values:
                # 各生理指標の統計量を特徴ベクトルに
                features = []

                # GSR特徴
                features.extend([
                    np.mean(gsr_values),
                    np.std(gsr_values),
                    np.min(gsr_values),
                    np.max(gsr_values),
                    np.percentile(gsr_values, 75) - np.percentile(gsr_values, 25)  # IQR
                ])

                # HRV特徴
                features.extend([
                    np.mean(hrv_values),
                    np.std(hrv_values),
                    np.min(hrv_values),
                    np.max(hrv_values),
                    np.percentile(hrv_values, 75) - np.percentile(hrv_values, 25)
                ])

                # SCL特徴
                features.extend([
                    np.mean(scl_values),
                    np.std(scl_values),
                    np.min(scl_values),
                    np.max(scl_values),
                    np.percentile(scl_values, 75) - np.percentile(scl_values, 25)
                ])

                windows.append('\t'.join([f"{x:.6f}" for x in features]))

                # メタデータ
                metadata.append({
                    'window_start': window_data[0]['timestamp'],
                    'window_end': window_data[-1]['timestamp'],
                    'participant_id': window_data[0].get('participant_id', 'unknown'),
                    'sample_count': len(window_data)
                })

        # ベクトルファイル
        vectors_file = self.output_dir / "physiological_timeseries_vectors.tsv"
        with open(vectors_file, 'w', encoding='utf-8') as f:
            for vector in windows:
                f.write(f"{vector}\n")

        # メタデータファイル
        metadata_file = self.output_dir / "physiological_timeseries_metadata.tsv"
        with open(metadata_file, 'w', encoding='utf-8') as f:
            f.write("window_start\twindow_end\tparticipant_id\tsample_count\n")
            for meta in metadata:
                f.write(f"{meta['window_start']}\t{meta['window_end']}\t{meta['participant_id']}\t{meta['sample_count']}\n")

        logging.info(f"Exported {len(windows)} physiological time-series windows")
        return {
            'vectors': str(vectors_file),
            'metadata': str(metadata_file)
        }

    def create_projector_config(self, datasets: Dict[str, Dict[str, str]]) -> str:
        """
        TensorFlow Projector用の設定JSONを作成

        Args:
            datasets: データセット名 -> ファイルパスの辞書

        Returns:
            設定JSONファイルのパス
        """
        config = {
            "embeddings": []
        }

        for name, files in datasets.items():
            embedding_config = {
                "tensorName": name,
                "tensorShape": [1000, 128],  # 仮定の形状、後で実際のデータに基づいて更新
                "tensorPath": f"https://example.com/{name}_vectors.tsv",  # 実際のホスティングURLに置き換え
                "metadataPath": f"https://example.com/{name}_metadata.tsv",
                "bookmarksPath": f"https://example.com/{name}_bookmarks.tsv"
            }
            config["embeddings"].append(embedding_config)

        # 設定ファイルを保存
        config_file = self.output_dir / "projector_config.json"
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

        logging.info(f"Created projector config: {config_file}")
        return str(config_file)

    def export_all_datasets(self) -> Dict[str, Dict[str, str]]:
        """
        利用可能なすべてのデータセットをエクスポート

        Returns:
            データセット名 -> ファイルパスの辞書
        """
        logging.info("Exporting all available datasets for TensorFlow Projector")

        # サンプルデータの作成（実際の実装では実際のデータを読み込む）
        datasets = {}

        # 1. Word embeddings
        word_data = {
            '愛': np.random.normal(0, 1, 128),
            '喜び': np.random.normal(0, 1, 128),
            '怒り': np.random.normal(0, 1, 128),
            '悲しみ': np.random.normal(0, 1, 128),
            '恐れ': np.random.normal(0, 1, 128),
            '驚き': np.random.normal(0, 1, 128),
            '平静': np.random.normal(0, 1, 128),
            '幸福': np.random.normal(0, 1, 128),
            '不安': np.random.normal(0, 1, 128),
            '安心': np.random.normal(0, 1, 128)
        }
        datasets['word_embeddings'] = self.export_word_embeddings(word_data)

        # 2. Emotion patterns
        emotion_data = []
        for i in range(200):
            emotion_data.append({
                'timestamp': i * 0.1,
                'emotion_type': np.random.choice(['anger', 'joy', 'fear', 'sadness', 'surprise']),
                'intensity': np.random.beta(2, 2),
                'valence': np.random.uniform(-1, 1),
                'arousal': np.random.uniform(-1, 1),
                'participant_id': f'participant_{(i % 12) + 1}'
            })
        datasets['emotion_patterns'] = self.export_emotion_patterns(emotion_data)

        # 3. Participant features
        participant_data = []
        for i in range(12):
            participant_data.append({
                'id': f'2a0d7a69-f953-4c29-87a5-8a8e4e8bd413_participant_{i+1}',
                'features': {},
                'metrics': {
                    'spirit_probability': np.random.beta(5, 2),
                    'gsr_anger_correlation': np.random.normal(0.3, 0.2),
                    'gsr_joy_correlation': np.random.normal(0.2, 0.15),
                    'hrv_sadness_correlation': np.random.normal(-0.25, 0.15),
                    'avg_reaction_time': np.random.normal(2.5, 0.5),
                    'data_quality_score': np.random.normal(75, 10),
                    'session_count': np.random.randint(1, 4)
                }
            })
        datasets['participant_features'] = self.export_participant_features(participant_data)

        # 4. Physiological time-series
        physiological_data = []
        for i in range(600):  # 60秒分のデータ (100ms間隔)
            physiological_data.append({
                'timestamp': i * 0.1,
                'gsr': np.random.normal(5, 1) + np.sin(i * 0.1) * 0.5,
                'hrv': np.random.normal(50, 8) + np.cos(i * 0.1) * 3,
                'scl': np.random.normal(3, 0.5) + np.sin(i * 0.05) * 0.3,
                'participant_id': f'participant_{(i % 12) + 1}'
            })
        datasets['physiological_timeseries'] = self.export_physiological_timeseries(physiological_data)

        # 設定ファイルの作成
        config_file = self.create_projector_config(datasets)

        # エクスポートサマリーの作成
        summary = self.create_export_summary(datasets, config_file)

        return datasets

    def create_export_summary(self, datasets: Dict[str, Dict[str, str]], config_file: str) -> str:
        """
        エクスポートサマリーを作成

        Args:
            datasets: エクスポートされたデータセット
            config_file: 設定ファイルのパス

        Returns:
            サマリーファイルのパス
        """
        summary_file = self.output_dir / "export_summary.md"

        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write("# TensorFlow Projector データエクスポートサマリー\n\n")
            f.write(f"生成日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("## エクスポートされたデータセット\n\n")

            for name, files in datasets.items():
                f.write(f"### {name.replace('_', ' ').title()}\n")
                f.write(f"- ベクトルファイル: `{files['vectors']}`\n")
                f.write(f"- メタデータファイル: `{files['metadata']}`\n\n")

            f.write("## TensorFlow Projector へのアップロード方法\n\n")
            f.write("1. [TensorFlow Projector](https://projector.tensorflow.org/) を開く\n")
            f.write("2. 「Load data from your computer」をクリック\n")
            f.write("3. ベクトルファイルをアップロード\n")
            f.write("4. メタデータファイルをアップロード（オプション）\n")
            f.write("5. 可視化を開始\n\n")

            f.write("## 設定ファイル\n\n")
            f.write(f"Projector設定ファイル: `{config_file}`\n\n")
            f.write("共有可能なURLを作成するには、ファイルをGitHub Gistなどで公開し、\n")
            f.write("設定ファイルのURLをProjectorの「Host projector config」に入力してください。\n\n")

            f.write("## データセットの説明\n\n")
            f.write("### Word Embeddings\n")
            f.write("- 感情関連単語の128次元ベクトル表現\n")
            f.write("- 感情の意味的類似性を可視化\n\n")

            f.write("### Emotion Patterns\n")
            f.write("- 実験中の感情変化パターン\n")
            f.write("- 感情タイプと強度の時系列データ\n\n")

            f.write("### Participant Features\n")
            f.write("- 各参加者の特徴ベクトル\n")
            f.write("- Spirit確率、相関係数、データ品質を含む\n\n")

            f.write("### Physiological Time-series\n")
            f.write("- 生理データの時系列ウィンドウ特徴\n")
            f.write("- GSR、HRV、SCLの統計量ベクトル\n\n")

        logging.info(f"Created export summary: {summary_file}")
        return str(summary_file)


def main():
    """メイン実行関数"""
    exporter = TensorFlowProjectorExporter()

    print("TensorFlow Projector データエクスポートを開始します...")

    # すべてのデータセットをエクスポート
    datasets = exporter.export_all_datasets()

    print(f"\nエクスポート完了！ {len(datasets)} 個のデータセットが作成されました。")
    print(f"出力ディレクトリ: {exporter.output_dir}")

    for name, files in datasets.items():
        print(f"\n{name}:")
        print(f"  ベクトル: {files['vectors']}")
        print(f"  メタデータ: {files['metadata']}")

    print("\nTensorFlow Projectorでの可視化方法:")
    print("1. https://projector.tensorflow.org/ を開く")
    print("2. 'Load data from your computer' をクリック")
    print("3. ベクトルファイルとメタデータファイルをアップロード")
    print("4. UMAP、t-SNE、PCAなどの次元削減手法を選択")
    print("5. インタラクティブにデータを探索")

if __name__ == "__main__":
    main()
