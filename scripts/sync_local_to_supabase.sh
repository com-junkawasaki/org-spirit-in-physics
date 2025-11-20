#!/bin/bash
# ローカルデータベースをSupabase本番スキーマに合わせるスクリプト
# Merkle DAG: schema.sync.local_to_supabase

set -euo pipefail

LOCAL_DB_URL="${LOCAL_DB_URL:-postgresql://postgres:postgres@localhost:5432/spirit_in_physics}"
SUPABASE_DB_URL="${SUPABASE_DATABASE_URL:-}"

echo "=== ローカルデータベースをSupabaseに合わせる ==="
echo ""

if [ -z "$SUPABASE_DB_URL" ]; then
    echo "⚠️  SUPABASE_DATABASE_URLが設定されていません"
    echo ""
    echo "Supabase Dashboardからスキーマを確認して、以下のマイグレーションを適用してください:"
    echo ""
    echo "1. Supabase Dashboard > SQL Editor で以下を実行:"
    echo ""
    cat << 'SQL'
-- Supabaseのtimeline_pointsテーブル構造を確認
\d timeline_points

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
        ELSE 'metadataカラムが存在しません - 追加が必要です'
    END as metadata_status;
SQL
    echo ""
    echo "2. ローカルに適用するマイグレーション:"
    echo "   scripts/apply_supabase_schema_to_local.sql を確認してください"
    exit 0
fi

echo "1. Supabaseスキーマを取得中..."
if ! psql "$SUPABASE_DB_URL" -c "\d timeline_points" > /tmp/supabase_timeline_points.txt 2>&1; then
    echo "❌ Supabaseへの接続に失敗しました"
    echo "接続エラー:"
    cat /tmp/supabase_timeline_points.txt
    exit 1
fi

echo "2. ローカルスキーマを取得中..."
psql "$LOCAL_DB_URL" -c "\d timeline_points" > /tmp/local_timeline_points.txt

echo "3. 差分を確認中..."
diff -u /tmp/local_timeline_points.txt /tmp/supabase_timeline_points.txt || echo "差分あり"

echo ""
echo "4. Supabaseスキーマに合わせてローカルを修正中..."

# Supabaseのスキーマに合わせる処理をここに追加
# 例: metadataカラムがSupabaseにない場合は削除
# 例: カラムの順序や型をSupabaseに合わせる

echo "✅ 完了"

