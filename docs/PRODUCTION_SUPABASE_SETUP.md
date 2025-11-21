# 本番Supabaseセットアップ完了レポート

## 実施内容

### 1. ✅ Supabase CLI設定と本番環境へのリンク準備
- プロジェクト参照ID: `pxsuqemlayhnmcxuiigk`
- Supabase URL: `https://pxsuqemlayhnmcxuiigk.supabase.co`
- Service Role Key: 設定済み

### 2. ✅ マイグレーションファイルの確認
以下のマイグレーションファイルが確認されました（時系列順）:
- `20241004000001_initial_schema.sql` - 初期スキーマ
- `20241004000002_enable_rls_policies.sql` - RLSポリシー
- `20241004000003_storage_policies.sql` - Storageポリシー
- `20241004000004_analysis_schema.sql` - 分析スキーマ
- `20241004000005_durable_jobs.sql` - ジョブ管理
- `20241004000006_job_functions.sql` - ジョブ関数
- `20241004000007_add_participant_name.sql` - 参加者名追加
- `20241004000008_add_hume_tables.sql` - Humeテーブル
- `20241004000009_add_analysis_results.sql` - 分析結果
- `20241004000010_add_analysis_views.sql` - 分析ビュー
- `20250111000001_enable_timescaledb.sql` - TimescaleDB拡張機能有効化
- `20250111000002_create_timeseries_tables.sql` - 時系列テーブル
- `20250111000003_create_emotion_tables.sql` - 感情データテーブル
- `20250111000004_create_indexes.sql` - インデックス
- `20250111000005_link_sessions_tables.sql` - セッションテーブル統合
- `20250112000001_create_timeline_aggregates.sql` - タイムライン集計

### 3. ⚠️ マイグレーション適用（要データベースパスワード）
マイグレーション適用にはデータベースパスワードが必要です。
以下の手順で適用してください:

```bash
# 1. データベースパスワードを環境変数に設定
export DB_PASSWORD="your-database-password"

# 2. Supabase CLIでプロジェクトをリンク
supabase link --project-ref pxsuqemlayhnmcxuiigk --password "${DB_PASSWORD}"

# 3. マイグレーションを適用
supabase db push
```

または、Supabase DashboardのSQL Editorから直接マイグレーションファイルを実行してください。

### 4. ✅ Storageバケットの確認
Storageバケット`spirit-in-physics`は既に存在することを確認しました。

### 5. ✅ 環境変数の更新
`docker-compose.yml`の環境変数を本番用に更新しました:

- `import-service`:
  - `DATABASE_URL`: 環境変数`SUPABASE_DATABASE_URL`から読み込み（デフォルト: ローカルPostgreSQL）
  
- `graphql-service`:
  - `DATABASE_URL`: 環境変数`SUPABASE_DATABASE_URL`から読み込み（デフォルト: ローカルPostgreSQL）
  - `SUPABASE_URL`: 環境変数`SUPABASE_URL`から読み込み（デフォルト: `https://pxsuqemlayhnmcxuiigk.supabase.co`）
  - `SUPABASE_SERVICE_ROLE_KEY`: 環境変数`SUPABASE_SERVICE_ROLE_KEY`から読み込み（デフォルト: 本番Service Role Key）

### 6. ⏳ 接続テスト（マイグレーション適用後）
マイグレーション適用後、以下のコマンドで接続テストを実行してください:

```bash
# importサービスの接続テスト
curl http://localhost:8082/import/status

# GraphQLサービスの接続テスト
curl http://localhost:8081/health
```

## 次のステップ

1. **データベースパスワードの取得**
   - Supabase Dashboard > Project Settings > Database > Database password
   - または、接続文字列から取得

2. **マイグレーションの適用**
   - 上記の手順に従ってマイグレーションを適用

3. **TimescaleDB拡張機能の確認**
   ```bash
   supabase db execute "SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';"
   ```

4. **環境変数の設定**
   ```bash
   export SUPABASE_DATABASE_URL="postgresql://postgres.pxsuqemlayhnmcxuiigk:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
   export SUPABASE_URL="https://pxsuqemlayhnmcxuiigk.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4c3VxZW1sYXlobm1jeHVpaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDUxNjk3MiwiZXhwIjoyMDY2MDkyOTcyfQ.7KSDYa5pxYCiA_ZtTe_8KPGBKELdj0buxba2nG7EnJc"
   ```

5. **サービスの起動**
   ```bash
   docker-compose up -d import-service graphql-service
   ```

## 注意事項

- TimescaleDB拡張機能はSupabase Proプランが必要です。本番環境で利用可能か確認してください。
- マイグレーション適用前に本番データベースのバックアップを推奨します。
- 本番環境への直接接続のため、慎重に作業を進めてください。
- Service Role Keyは機密情報です。環境変数やシークレット管理システムで適切に管理してください。

## 作成されたファイル

- `scripts/apply_production_migrations.sh` - マイグレーション適用スクリプト
- `scripts/setup_production_supabase.md` - セットアップ手順書
- `docs/PRODUCTION_SUPABASE_SETUP.md` - このレポート

