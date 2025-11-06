# GraphQL Server (Rust)

GraphQLサーバーのRust実装。researcherアプリとparticipantアプリから使用されます。

## 起動方法

```bash
cd apps/graphql-server
cargo run
```

デフォルトでポート3003で起動します。

## 環境変数

以下の環境変数を設定してください：

- `SUPABASE_URL`: SupabaseプロジェクトURL
- `SUPABASE_SERVICE_ROLE_KEY` または `SUPABASE_ANON_KEY`: Supabaseキー
- `RUST_ACTIVITIES_URL`: Rust activitiesサーバーURL（デフォルト: `http://localhost:3001`）
- `ANALYZER_URL`: Rust analyzerサーバーURL（デフォルト: `http://localhost:3002`）
- `PORT`: サーバーポート（デフォルト: `3003`）

## GraphQLエンドポイント

- **GraphQL API**: `http://localhost:3003/graphql`
- **GraphQL Playground**: `http://localhost:3003/graphql` (GETリクエスト)
- **Health Check**: `http://localhost:3003/health`

## スキーマ

### Query

- `participants`: 全参加者を取得
- `participant(id: String!)`: 参加者をIDで取得
- `sessions(participantId: String)`: セッション一覧を取得
- `analysisResults(participantId: String, experimentId: String)`: 分析結果を取得

### Mutation

- `executeActivity(activityId: String!, inputs: JSON!)`: Rust activitiesサーバーでアクティビティを実行
- `analyzeParticipant(participantId: String!, experimentId: String)`: Rust analyzerサーバーで参加者データを解析

## 技術スタック

- **async-graphql**: GraphQLスキーマ定義とリゾルバー
- **async-graphql-axum**: Axum統合
- **axum**: HTTPサーバー
- **reqwest**: Supabase REST API呼び出し

## クライアント側の設定

### researcherアプリ

`apps/researcher/src/lib/graphql/client.ts`が`http://localhost:3003/graphql`をデフォルトで使用します。
環境変数`NEXT_PUBLIC_RUST_GRAPHQL_URL`でオーバーライド可能です。

### participantアプリ

`apps/participant/src/lib/graphql/client.ts`が`http://localhost:3003/graphql`をデフォルトで使用します。
環境変数`NEXT_PUBLIC_RUST_GRAPHQL_URL`でオーバーライド可能です。
