# GraphQL Server Testing Guide

## 起動方法

```bash
cd apps/graphql-server

# 環境変数を設定（.envファイルを作成）
cp .env.example .env
# .envファイルを編集してSupabaseの認証情報を設定

# サーバーを起動
cargo run
```

## 動作確認

### 1. Health Check

```bash
curl http://localhost:3003/health
```

期待される応答: `OK`

### 2. GraphQL Playground

ブラウザで以下にアクセス:
```
http://localhost:3003/graphql
```

### 3. GraphQL Query テスト

```bash
curl -X POST http://localhost:3003/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ participants { id age gender createdAt } }"
  }'
```

### 4. GraphQL Mutation テスト

```bash
curl -X POST http://localhost:3003/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { analyzeParticipant(participantId: \"your-participant-id\") { success result error } }"
  }'
```

## トラブルシューティング

### エラー: "SUPABASE_URL not set"
- `.env`ファイルに`SUPABASE_URL`を設定してください

### エラー: "Failed to initialize Supabase client"
- `SUPABASE_SERVICE_ROLE_KEY`または`SUPABASE_ANON_KEY`が正しく設定されているか確認してください

### エラー: "Failed to call activities server"
- Rust activitiesサーバーが起動しているか確認してください（デフォルト: `http://localhost:3001`）
- `RUST_ACTIVITIES_URL`環境変数でURLを変更可能です

### エラー: "Failed to call analyzer server"
- Rust analyzerサーバーが起動しているか確認してください（デフォルト: `http://localhost:3002`）
- `ANALYZER_URL`環境変数でURLを変更可能です

