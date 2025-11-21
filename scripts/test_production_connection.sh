#!/bin/bash
# 本番Supabase接続テストスクリプト
# Merkle DAG: test.script.production_connection

set -euo pipefail

PROJECT_REF="pxsuqemlayhnmcxuiigk"
DB_PASSWORD="yJ21jzT0oy3Dgmfz"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
DB_URL="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4c3VxZW1sYXlobm1jeHVpaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDUxNjk3MiwiZXhwIjoyMDY2MDkyOTcyfQ.7KSDYa5pxYCiA_ZtTe_8KPGBKELdj0buxba2nG7EnJc"

echo "=== 本番Supabase接続テスト ==="
echo ""

# 1. PostgreSQL接続テスト
echo "1. PostgreSQL接続テスト..."
if psql "${DB_URL}" -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ PostgreSQL接続成功"
    psql "${DB_URL}" -c "SELECT version();" | head -3
else
    echo "❌ PostgreSQL接続失敗"
    exit 1
fi
echo ""

# 2. テーブル存在確認
echo "2. テーブル存在確認..."
TABLE_COUNT=$(psql "${DB_URL}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
echo "✅ テーブル数: ${TABLE_COUNT}"
psql "${DB_URL}" -c "\dt" | head -25
echo ""

# 3. Storage API接続テスト
echo "3. Storage API接続テスト..."
if curl -s -X GET "${SUPABASE_URL}/storage/v1/bucket" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" | grep -q "spirit-in-physics"; then
    echo "✅ Storage API接続成功"
    echo "✅ Storageバケット 'spirit-in-physics' が存在します"
else
    echo "❌ Storage API接続失敗"
    exit 1
fi
echo ""

# 4. REST API接続テスト
echo "4. REST API接続テスト..."
if curl -s -X GET "${SUPABASE_URL}/rest/v1/" \
    -H "apikey: ${SERVICE_ROLE_KEY}" | grep -q "swagger"; then
    echo "✅ REST API接続成功"
else
    echo "❌ REST API接続失敗"
    exit 1
fi
echo ""

echo "=== すべての接続テストが成功しました ==="

