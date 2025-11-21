#!/bin/bash
# Supabase CLIを使用して本番スキーマを取得するスクリプト
# Merkle DAG: schema.pull.supabase

set -euo pipefail

PROJECT_REF="pxsuqemlayhnmcxuiigk"

echo "=== Supabase CLIでスキーマを取得 ==="
echo ""

# 1. Supabase CLIにログイン（必要に応じて）
if ! supabase projects list > /dev/null 2>&1; then
    echo "⚠️  Supabase CLIにログインが必要です"
    echo "以下のコマンドを実行してください:"
    echo "  supabase login"
    echo ""
    echo "または、環境変数を設定してください:"
    echo "  export SUPABASE_ACCESS_TOKEN=\"your-access-token\""
    exit 1
fi

echo "✅ Supabase CLIにログイン済み"
echo ""

# 2. プロジェクトをリンク
echo "2. プロジェクトをリンク中..."
if ! supabase link --project-ref "$PROJECT_REF" 2>&1 | grep -q "Linked\|already linked"; then
    echo "⚠️  プロジェクトのリンクに失敗しました"
    echo "パスワードの入力が必要な場合があります:"
    echo "  supabase link --project-ref $PROJECT_REF --password \"your-password\""
    exit 1
fi

echo "✅ プロジェクトをリンクしました"
echo ""

# 3. リモートスキーマを取得
echo "3. リモートスキーマを取得中..."
if supabase db pull --schema public 2>&1; then
    echo "✅ スキーマを取得しました"
else
    echo "⚠️  スキーマの取得に失敗しました"
    exit 1
fi

echo ""
echo "4. スキーマの差分を確認中..."
supabase db diff --schema public 2>&1 | head -100 || echo "差分なし"

echo ""
echo "=== 完了 ==="
echo ""
echo "取得したスキーマは supabase/migrations/ に保存されています"

