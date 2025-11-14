# 本番Supabaseセットアップ手順

## 前提条件

- Supabaseプロジェクト参照ID: `pxsuqemlayhnmcxuiigk`
- Supabase URL: `https://pxsuqemlayhnmcxuiigk.supabase.co`
- Service Role Key: 提供済み
- Storageバケット: `spirit-in-physics` (既に存在)

## 必要な情報

1. **データベースパスワード**: Supabase Dashboard > Project Settings > Database > Database password
2. **データベース接続URL**: Supabase Dashboard > Project Settings > Database > Connection string > Transaction mode

## セットアップ手順

### 1. 環境変数の設定

`.env.production`ファイルを作成し、以下の環境変数を設定してください：

```bash
# Supabase Project URL
SUPABASE_URL=https://pxsuqemlayhnmcxuiigk.supabase.co

# Supabase Service Role Key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4c3VxZW1sYXlobm1jeHVpaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDUxNjk3MiwiZXhwIjoyMDY2MDkyOTcyfQ.7KSDYa5pxYCiA_ZtTe_8KPGBKELdj0buxba2nG7EnJc

# Supabase Database Connection URL
# Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
SUPABASE_DATABASE_URL=postgresql://postgres.pxsuqemlayhnmcxuiigk:[YOUR_DATABASE_PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### 2. Supabase CLIでプロジェクトをリンク

```bash
# データベースパスワードを環境変数に設定
export DB_PASSWORD="your-database-password"

# プロジェクトをリンク
supabase link --project-ref pxsuqemlayhnmcxuiigk --password "${DB_PASSWORD}"
```

### 3. マイグレーションの適用

```bash
# マイグレーションを本番環境に適用
supabase db push
```

### 4. TimescaleDB拡張機能の確認

```bash
# TimescaleDB拡張機能が有効化されているか確認
supabase db execute "SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';"
```

### 5. Storageバケットの確認

Storageバケット`spirit-in-physics`は既に存在していることを確認済みです。

### 6. 環境変数の更新

`docker-compose.yml`の環境変数は既に更新済みです。以下の環境変数を設定してからDocker Composeを起動してください：

```bash
export SUPABASE_DATABASE_URL="postgresql://postgres.pxsuqemlayhnmcxuiigk:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
export SUPABASE_URL="https://pxsuqemlayhnmcxuiigk.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4c3VxZW1sYXlobm1jeHVpaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDUxNjk3MiwiZXhwIjoyMDY2MDkyOTcyfQ.7KSDYa5pxYCiA_ZtTe_8KPGBKELdj0buxba2nG7EnJc"

docker-compose up -d import-service graphql-service
```

### 7. 接続テスト

```bash
# importサービスの接続テスト
curl http://localhost:8082/import/status

# GraphQLサービスの接続テスト
curl http://localhost:8081/health
```

## 注意事項

- TimescaleDB拡張機能はSupabase Proプランが必要です。本番環境で利用可能か確認してください。
- マイグレーション適用前に本番データベースのバックアップを推奨します。
- 本番環境への直接接続のため、慎重に作業を進めてください。

