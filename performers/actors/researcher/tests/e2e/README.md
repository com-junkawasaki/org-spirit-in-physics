# E2E Performance Tests

## 概要

参加者詳細ページのパフォーマンスを計測するE2Eテストです。

## テスト内容

### 1. `should measure participant detail page load performance`
- ページロード時間の計測
- ブラウザのPerformance APIを使用した計測
- Debug Areaからのパフォーマンスメトリクスの取得

### 2. `should measure timeline data fetch performance`
- Timeline APIリクエストの計測
- リクエスト/レスポンスのタイミング計測

### 3. `should measure force graph data fetch performance`
- Force Graph GraphQLクエリの計測
- GraphQLリクエストのタイミング計測

### 4. `should measure full page render performance`
- 完全なページレンダリング時間の計測
- First Paint、First Contentful Paintの計測

### 5. `should measure performance with console logs`
- コンソールログからのパフォーマンスメトリクスの収集

## 実行方法

### 前提条件

1. Docker Composeでサービスが起動していること
2. テスト対象の参加者IDが存在すること（デフォルト: `144b325f-5966-4d59-a629-f2ca421388cc`）
3. Playwrightがインストールされていること

### インストール

```bash
# Playwrightをインストール
pnpm install

# Playwrightブラウザをインストール
pnpm exec playwright install
```

### 環境変数

```bash
export PLAYWRIGHT_BASE_URL=https://researcher.spirit-in-physics.orb.local
export TEST_PARTICIPANT_ID=144b325f-5966-4d59-a629-f2ca421388cc
```

### テスト実行

```bash
# パフォーマンステストのみ実行
pnpm test:e2e:performance

# すべてのE2Eテストを実行
pnpm test:e2e

# UIモードで実行（デバッグ用）
pnpm test:e2e:ui

# レポートを表示
pnpm test:e2e:report
```

## 計測されるメトリクス

### ブラウザメトリクス
- DOMContentLoaded時間
- Load完了時間
- First Paint (FP)
- First Contentful Paint (FCP)
- 総ロード時間

### APIメトリクス
- Timeline APIリクエスト時間
- GraphQLクエリ実行時間
- レスポンスサイズ

### アプリケーションメトリクス（Debug Areaから）
- API Request時間
- Data Conversion時間
- Total Time
- Response Size

### メモリメトリクス（利用可能な場合）
- Used JS Heap Size
- Total JS Heap Size
- JS Heap Size Limit

## パフォーマンス閾値

- 総ロード時間: < 10秒
- APIリクエスト時間: < 5秒
- First Contentful Paint: < 3秒

## 結果の確認

テスト実行後、以下の場所で結果を確認できます：

1. **コンソール出力**: テスト実行中のリアルタイムログ
2. **HTMLレポート**: `playwright-report/index.html`
3. **JSON結果**: `test-results/results.json`

## トラブルシューティング

### テストがタイムアウトする場合

1. サービスが正常に起動しているか確認
2. ネットワーク接続を確認
3. タイムアウト値を増やす（`playwright.config.ts`で設定）

### パフォーマンスメトリクスが取得できない場合

1. Debug Areaが表示されているか確認
2. コンソールログが有効になっているか確認
3. ブラウザのPerformance APIが利用可能か確認

