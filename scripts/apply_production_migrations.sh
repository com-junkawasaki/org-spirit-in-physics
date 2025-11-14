#!/bin/bash
# 本番Supabaseへのマイグレーション適用スクリプト
# Merkle DAG: migration.script.apply_production

set -euo pipefail

PROJECT_REF="pxsuqemlayhnmcxuiigk"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4c3VxZW1sYXlobm1jeHVpaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDUxNjk3MiwiZXhwIjoyMDY2MDkyOTcyfQ.7KSDYa5pxYCiA_ZtTe_8KPGBKELdj0buxba2nG7EnJc"

echo "本番Supabaseへのマイグレーション適用を開始します..."
echo "プロジェクト: ${PROJECT_REF}"
echo "URL: ${SUPABASE_URL}"

# Supabase CLIでマイグレーションを適用
# 注意: データベースパスワードが必要な場合は、環境変数DB_PASSWORDを設定してください
if [ -n "${DB_PASSWORD:-}" ]; then
    echo "データベースパスワードを使用してリンクします..."
    supabase link --project-ref "${PROJECT_REF}" --password "${DB_PASSWORD}"
    supabase db push
else
    echo "警告: DB_PASSWORDが設定されていません。"
    echo "Supabase Dashboardからデータベースパスワードを取得し、以下のコマンドを実行してください:"
    echo "  export DB_PASSWORD='your-database-password'"
    echo "  ./scripts/apply_production_migrations.sh"
    echo ""
    echo "または、Supabase CLIで直接リンクしてください:"
    echo "  supabase link --project-ref ${PROJECT_REF}"
    exit 1
fi

echo "マイグレーション適用が完了しました。"

