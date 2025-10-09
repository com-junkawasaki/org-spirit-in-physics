# Spirit in Physics - Visualizer

データ可視化アプリケーション。参加者の分析結果、相関分析、タイムラインなどをインタラクティブに表示します。

## 機能

- **参加者一覧**: 実験参加者の概要と分析結果の確認
- **詳細分析**: 個別参加者の分析結果と時系列データ
- **相関分析**: 生理データと感情データの相関関係の可視化
- **タイムライン**: 実験セッションの時系列イベント表示
- **ダッシュボード**: 全体的な統計と分析結果の概要

## 技術スタック

- **Next.js 15**: React フレームワーク
- **TypeScript**: 型安全な開発
- **Tailwind CSS**: スタイリング
- **D3.js & Plotly.js**: データ可視化
- **Recharts**: チャートコンポーネント

## 統合アーキテクチャ

Visualizer は Axon Framework Backend を経由してデータを取得します：

```
Visualizer (Next.js) → Backend (Axon/Kotlin) → PostgreSQL
                       ↘ Temporal (Workflows)
```

### データフロー

1. **Frontend Request**: Visualizer が `/api/*` エンドポイントを呼び出し
2. **Proxy**: Next.js API Routes が Backend API にプロキシ
3. **CQRS Query**: Backend が Axon Query 経由でデータを取得
4. **Read Model**: Projection から最適化されたデータを返却

## 環境変数

```bash
# Backend API URL
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8080/api
BACKEND_API_URL=http://localhost:8080/api
```

## 開発

```bash
cd apps/visualizer
pnpm install
pnpm dev
```

## Docker 実行

```bash
# 個別実行
docker-compose up -d

# または全システム統合
cd ../..
docker-compose up -d
```

## API エンドポイント

### 参加者データ
- `GET /api/participants` - 参加者一覧
- `GET /api/participants/[id]` - 参加者詳細

### 分析データ
- `GET /api/analysis-results` - 分析結果一覧
- `GET /api/dashboard/stats` - ダッシュボード統計

### 相関・時系列
- `GET /api/participants/[id]/correlation` - 相関分析
- `GET /api/participants/[id]/timeline` - タイムラインデータ
- `GET /api/responses/[id]/timeseries` - 応答時系列データ

## コンポーネント構造

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (Backend Proxy)
│   ├── participants/      # 参加者ページ
│   └── page.tsx          # ホームページ
├── components/            # React コンポーネント
│   ├── DashboardOverview.tsx
│   ├── StatsCard.tsx
│   └── ui/               # UI コンポーネント
├── lib/                  # ユーティリティ
│   ├── data.ts          # Backend API クライアント
│   ├── data-proxy.ts    # API Proxy
│   └── utils.ts         # ヘルパー関数
└── types/               # TypeScript 型定義
```

## 可視化機能

### ダッシュボード
- 参加者数・セッション数・平均Spirit確率
- 感情分布チャート
- 分析コンポーネントの平均値

### 参加者詳細
- Spirit確率の時系列推移
- 各分析コンポーネントの内訳
- 感情データと生理データの相関

### 相関分析
- ピアソン・スピアマン相関係数
- 時間ウィンドウベース分析
- 統計的有意性の表示

## 統合ポイント

### Backend API 統合
- `VisualizerController` - REST エンドポイント提供
- `VisualizerService` - データ変換・集計ロジック
- Axon Query による CQRS 準拠のデータ取得

### Temporal ワークフロー統合
- 分析ジョブのステータス監視
- ワークフロー結果のリアルタイム表示
- 長時間実行分析の進捗表示

## デプロイ

### 開発環境
```bash
pnpm build
pnpm start
```

### 本番環境
```bash
docker build -t spirit-visualizer .
docker run -p 3000:3000 spirit-visualizer
```

## 監視・メトリクス

- **ヘルスチェック**: `/api/health`
- **パフォーマンス**: Next.js Analytics
- **エラートラッキング**: コンソールログ + Backend 連携

この Visualizer は、Spirit in Physics 研究プラットフォームのデータ可視化・分析インターフェースとして、Backend の CQRS アーキテクチャと統合されています。
