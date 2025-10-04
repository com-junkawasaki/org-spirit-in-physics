# TensorFlow Projector データエクスポートサマリー

生成日時: 2025-10-05 02:22:35

## エクスポートされたデータセット

### Word Embeddings
- ベクトルファイル: `tensorflow-projector-data/word_embeddings_vectors.tsv`
- メタデータファイル: `tensorflow-projector-data/word_embeddings_metadata.tsv`

### Emotion Patterns
- ベクトルファイル: `tensorflow-projector-data/emotion_patterns_vectors.tsv`
- メタデータファイル: `tensorflow-projector-data/emotion_patterns_metadata.tsv`

### Participant Features
- ベクトルファイル: `tensorflow-projector-data/participant_features_vectors.tsv`
- メタデータファイル: `tensorflow-projector-data/participant_features_metadata.tsv`

### Physiological Timeseries
- ベクトルファイル: `tensorflow-projector-data/physiological_timeseries_vectors.tsv`
- メタデータファイル: `tensorflow-projector-data/physiological_timeseries_metadata.tsv`

## TensorFlow Projector へのアップロード方法

1. [TensorFlow Projector](https://projector.tensorflow.org/) を開く
2. 「Load data from your computer」をクリック
3. ベクトルファイルをアップロード
4. メタデータファイルをアップロード（オプション）
5. 可視化を開始

## 設定ファイル

Projector設定ファイル: `tensorflow-projector-data/projector_config.json`

共有可能なURLを作成するには、ファイルをGitHub Gistなどで公開し、
設定ファイルのURLをProjectorの「Host projector config」に入力してください。

## データセットの説明

### Word Embeddings
- 感情関連単語の128次元ベクトル表現
- 感情の意味的類似性を可視化

### Emotion Patterns
- 実験中の感情変化パターン
- 感情タイプと強度の時系列データ

### Participant Features
- 各参加者の特徴ベクトル
- Spirit確率、相関係数、データ品質を含む

### Physiological Time-series
- 生理データの時系列ウィンドウ特徴
- GSR、HRV、SCLの統計量ベクトル

