# Supabase CLIでスキーマを取得する方法

## 前提条件

1. Supabase CLIがインストールされていること
2. Supabase CLIにログインしていること
3. プロジェクトのデータベースパスワードを知っていること

## 手順

### 1. Supabase CLIにログイン

```bash
supabase login
```

ブラウザが開いて認証を行います。

### 2. プロジェクトをリンク

```bash
supabase link --project-ref pxsuqemlayhnmcxuiigk --password "your-database-password"
```

**注意**: パスワードはSupabase Dashboard > Project Settings > Database > Database password から取得できます。

### 3. リモートスキーマを取得

```bash
# リモートスキーマをマイグレーションファイルとして取得
supabase db pull --schema public
```

これにより、Supabase本番環境のスキーマが `supabase/migrations/` に新しいマイグレーションファイルとして保存されます。

### 4. スキーマの差分を確認

```bash
# ローカルとリモートの差分を確認
supabase db diff --schema public
```

### 5. ローカルをリモートに合わせる

```bash
# リモートのスキーマをローカルに適用
supabase db pull --schema public

# その後、ローカルデータベースにマイグレーションを適用
supabase db reset
# または
docker exec spirit-postgres psql -U postgres -d spirit_in_physics -f supabase/migrations/[最新のマイグレーションファイル]
```

## トラブルシューティング

### パスワードエラーが発生する場合

1. Supabase Dashboardにログイン
2. Project Settings > Database > Database password を確認
3. パスワードをリセットする場合は、Reset database password を実行

### 接続エラーが発生する場合

```bash
# デバッグモードで実行
supabase link --project-ref pxsuqemlayhnmcxuiigk --password "your-password" --debug

# または、直接接続文字列を使用
export SUPABASE_DB_URL="postgresql://postgres.pxsuqemlayhnmcxuiigk:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"
```

### プロジェクトがリンクされない場合

```bash
# 既存のリンクを確認
cat .supabase/config.toml

# リンクを解除して再リンク
supabase unlink
supabase link --project-ref pxsuqemlayhnmcxuiigk --password "your-password"
```

## 代替方法: Supabase Dashboardから直接確認

Supabase CLIが使えない場合は、Supabase DashboardのSQL Editorから直接確認できます:

1. Supabase Dashboardにログイン
2. SQL Editorを開く
3. 以下のSQLを実行:

```sql
-- timeline_pointsテーブルの構造を確認
\d timeline_points

-- カラム詳細を確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'timeline_points'
ORDER BY ordinal_position;

-- metadataカラムの存在確認
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'timeline_points' 
              AND column_name = 'metadata'
        ) THEN 'metadataカラムが存在します'
        ELSE 'metadataカラムが存在しません'
    END as metadata_status;
```

## スクリプトを使用する場合

```bash
bash scripts/pull_supabase_schema.sh
```

## 参考

- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli)
- [Supabase Database Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)

