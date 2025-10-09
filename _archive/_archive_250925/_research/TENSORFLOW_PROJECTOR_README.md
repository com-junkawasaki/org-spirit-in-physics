# TensorFlow Projector 埋め込みガイド

## 🚀 クイックスタート

1. **ローカルサーバーを起動**
   ```bash
   cd projects/_archive_250925/_research/interactive-visualization
   python -m http.server 8081
   ```

2. **ブラウザでアクセス**
   - http://localhost:8081/embedded-projector.html

## 📊 利用可能なデータセット

- **Word Embeddings**: 感情単語の意味的類似性 (10単語 × 128次元)
- **Emotion Patterns**: 実験中の感情変化 (200データポイント × 8次元)  
- **Participant Features**: Spirit確率と特徴量 (12参加者 × 6次元)
- **Physiological Time-series**: 生理データウィンドウ (38ウィンドウ × 15次元)

## 🎨 Projectorの操作方法

1. **次元削減**: UMAP/t-SNE/PCAを選択
2. **インタラクティブ探索**: ポイントクリックで最近傍表示
3. **カラーリング**: メタデータによる色付け
4. **検索**: 正規表現によるデータ検索

## 🔧 技術仕様

- **データ形式**: TSV (タブ区切り)
- **設定**: JSONベースの埋め込み設定
- **ブラウザ互換**: Chrome/Firefox/Safari対応
