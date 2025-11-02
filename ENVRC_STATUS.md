# .envrc 設定状況

## ✅ 保存済み設定

`.envrc`ファイルに以下のSupabase lawyerプロジェクト設定が保存されています：

```bash
# ================================================
# Supabase Lawyerプロジェクト設定
# ================================================
export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
export SUPABASE_URL="http://127.0.0.1:54321"
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

## 📋 設定内容

| 環境変数 | 値 | 説明 |
|---------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54321` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` | 匿名キー（クライアント側で使用） |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | サービスロールキー（サーバー側で使用） |
| `SUPABASE_URL` | `http://127.0.0.1:54321` | Supabase URL（エイリアス） |
| `DATABASE_URL` | `postgresql://...` | PostgreSQL接続URL |

## 🚀 使用方法

### 環境変数を読み込む

```bash
# direnvを使用している場合（推奨）
direnv allow

# 手動で読み込む場合
source .envrc
```

### 確認方法

```bash
# 環境変数が読み込まれているか確認
echo $NEXT_PUBLIC_SUPABASE_URL
# 出力: http://127.0.0.1:54321

echo $DATABASE_URL
# 出力: postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

## 📝 注意事項

- これらの設定は**ローカル開発環境**用です
- 本番環境では異なる値を設定してください
- `.envrc`ファイルは`.gitignore`に含まれている可能性があります（機密情報を含むため）

## 🔄 更新が必要な場合

Supabaseプロジェクトを再起動した場合、キーが変わる可能性があります：

```bash
# Supabaseの状態を確認
supabase status

# 新しいキーを.envrcに反映
# supabase statusの出力を確認して、必要に応じて更新
```

