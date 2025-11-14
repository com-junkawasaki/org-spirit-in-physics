#!/bin/bash
# Supabase REST API経由でマイグレーションを適用するスクリプト（代替方法）
# 注意: この方法は推奨されません。Supabase CLIを使用することを推奨します。

set -euo pipefail

PROJECT_REF="pxsuqemlayhnmcxuiigk"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4c3VxZW1sYXlobm1jeHVpaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDUxNjk3MiwiZXhwIjoyMDY2MDkyOTcyfQ.7KSDYa5pxYCiA_ZtTe_8KPGBKELdj0buxba2nG7EnJc"

echo "警告: このスクリプトはSupabase REST API経由でマイグレーションを適用しようとしますが、"
echo "REST APIはSQL実行をサポートしていません。"
echo ""
echo "推奨される方法:"
echo "1. Supabase Dashboardからデータベースパスワードを取得"
echo "2. 以下のコマンドを実行:"
echo "   export DB_PASSWORD='your-database-password'"
echo "   supabase link --project-ref ${PROJECT_REF} --password \"\${DB_PASSWORD}\""
echo "   supabase db push"
echo ""
echo "または、Supabase DashboardのSQL Editorから直接マイグレーションファイルを実行してください。"

exit 1

