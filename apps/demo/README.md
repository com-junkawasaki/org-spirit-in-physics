# Real-time Complex Visualization Demo

リアルタイムでJung単語連合テストを実行し、Hume AIで感情分析を行い、3D Force GraphとComplex可視化を表示するデモアプリケーション。

## 機能

- **リアルタイム単語表示**: Jung刺激語100語を順次表示
- **音声再生**: 各単語の発音を自動再生
- **Hume AI感情分析**: 単語表示ごとにカメラ/マイクから感情を検出
- **3D Force Graph**: 感情ベクトルを3D空間で可視化
- **Complex可視化**: "あなたのComplexはここです"を表示
- **構造分析**: 空白エリア、密度領域、重複候補を検出
- **iPad最適化**: タッチ操作に最適化されたUI

## セットアップ

```bash
cd apps/demo
pnpm install
```

## 環境変数

`.env`ファイルに以下を設定:

```
HUME_API_KEY=your_api_key
HUME_API_SECRET=your_secret_key
```

## 開発

```bash
pnpm dev
```

アプリは `http://localhost:4322` で起動します。

## 使用方法

1. ブラウザでアプリを開く
2. カメラ/マイクへのアクセスを許可
3. 「開始」ボタンをクリック
4. 単語が順次表示され、自動的に感情分析が実行されます
5. 3D Force GraphとComplex可視化がリアルタイムで更新されます

## 技術スタック

- Astro (SSR)
- React
- TypeScript
- Tailwind CSS
- Hume AI SDK
- WebGPU (3D Force Graph)

