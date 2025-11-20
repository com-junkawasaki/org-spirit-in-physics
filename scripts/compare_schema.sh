#!/bin/bash
# スキーマ比較スクリプト
# Merkle DAG: schema.comparison.script

set -euo pipefail

LOCAL_DB_URL="${LOCAL_DB_URL:-postgresql://postgres:postgres@localhost:5432/spirit_in_physics}"
SUPABASE_DB_URL="${SUPABASE_DATABASE_URL:-}"

echo "=== スキーマ比較レポート ==="
echo ""

if [ -z "$SUPABASE_DB_URL" ]; then
    echo "⚠️  SUPABASE_DATABASE_URLが設定されていません"
    echo "環境変数を設定してください:"
    echo "  export SUPABASE_DATABASE_URL=\"postgresql://postgres.pxsuqemlayhnmcxuiigk:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres\""
    echo ""
    echo "ローカルスキーマのみを表示します..."
    echo ""
    
    # ローカルスキーマのみ表示
    echo "=== ローカルデータベーススキーマ ==="
    psql "$LOCAL_DB_URL" -c "
    SELECT 
        table_name,
        COUNT(*) as column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    GROUP BY table_name
    ORDER BY table_name;
    "
    
    echo ""
    echo "=== timeline_pointsテーブル構造 ==="
    psql "$LOCAL_DB_URL" -c "\d timeline_points"
    
    exit 0
fi

echo "1. ローカルデータベーススキーマ取得中..."
psql "$LOCAL_DB_URL" -c "
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
" > /tmp/local_schema.txt

echo "2. Supabaseデータベーススキーマ取得中..."
if ! psql "$SUPABASE_DB_URL" -c "
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
" > /tmp/supabase_schema.txt 2>&1; then
    echo "❌ Supabaseデータベースへの接続に失敗しました"
    echo "接続エラー:"
    cat /tmp/supabase_schema.txt
    exit 1
fi

echo "3. スキーマ比較中..."
echo ""

# テーブル一覧比較
echo "=== テーブル一覧比較 ==="
LOCAL_TABLES=$(psql "$LOCAL_DB_URL" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;" | tr -d ' ' | sort)
SUPABASE_TABLES=$(psql "$SUPABASE_DB_URL" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;" | tr -d ' ' | sort)

echo "ローカルにのみ存在するテーブル:"
comm -23 <(echo "$LOCAL_TABLES") <(echo "$SUPABASE_TABLES") || echo "なし"

echo ""
echo "Supabaseにのみ存在するテーブル:"
comm -13 <(echo "$LOCAL_TABLES") <(echo "$SUPABASE_TABLES") || echo "なし"

echo ""
echo "=== timeline_pointsテーブル構造比較 ==="
echo ""
echo "--- ローカル ---"
psql "$LOCAL_DB_URL" -c "\d timeline_points" | head -30

echo ""
echo "--- Supabase ---"
psql "$SUPABASE_DB_URL" -c "\d timeline_points" | head -30

echo ""
echo "=== カラム差分 ==="
diff -u /tmp/local_schema.txt /tmp/supabase_schema.txt | head -100 || echo "差分なし"

