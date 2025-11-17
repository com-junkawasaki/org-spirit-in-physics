# GraphQLポート変更サマリー

## 変更内容

GraphQLサービスのポートを**8081**から**19910**に変更しました。

## 更新されたファイル

### 1. Docker Compose設定
- `docker-compose.yml`
  - ポートマッピング: `"19910:19910"`
  - 環境変数: `PORT=19910`
  - ヘルスチェック: `http://localhost:19910/health`

### 2. GraphQLサーバー設定
- `performers/services/graphql/src/main.rs`
  - デフォルトポート: `19910`

### 3. クライアント側設定
- `apps/visualizer/env.docker`
  - `GRAPHQL_API_URL=http://graphql-service:19910/graphql`
  - `NEXT_PUBLIC_GRAPHQL_API_URL=http://localhost:19910/graphql`

- `apps/visualizer/src/lib/graphql/client.ts`
  - フォールバックURL: `http://localhost:19910/graphql`

- `apps/visualizer/src/lib/graphql/apollo-client.ts`
  - フォールバックURL: `http://localhost:19910/graphql`
  - WebSocket URL: `ws://localhost:19910/graphql/ws`

## 新しいエンドポイント

- GraphQL API: `http://localhost:19910/graphql`
- WebSocket: `ws://localhost:19910/graphql/ws`
- GraphQL Playground: `http://localhost:19910/graphql/playground`
- ヘルスチェック: `http://localhost:19910/health`

## 次のステップ

1. Dockerコンテナを再起動:
   ```bash
   docker-compose restart graphql-service
   ```

2. 動作確認:
   ```bash
   curl http://localhost:19910/health
   ```

3. GraphQL Playgroundで確認:
   ```
   http://localhost:19910/graphql/playground
   ```

