#!/bin/bash
# 環境変数を読み込むスクリプト

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "📋 環境変数を読み込みます..."
echo ""

# ルートの.envrcを読み込み
if [ -f "$PROJECT_ROOT/.envrc" ]; then
    echo "✅ $PROJECT_ROOT/.envrc を読み込み中..."
    source "$PROJECT_ROOT/.envrc"
fi

# apps/patient/.envrcを読み込み
if [ -f "$PROJECT_ROOT/apps/patient/.envrc" ]; then
    echo "✅ $PROJECT_ROOT/apps/patient/.envrc を読み込み中..."
    source "$PROJECT_ROOT/apps/patient/.envrc"
fi

echo ""
echo "✅ 環境変数の読み込みが完了しました"
echo ""
echo "設定された環境変数:"
echo "  NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:-未設定}"
echo "  DATABASE_URL: ${DATABASE_URL:0:50}..."
echo "  SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:50}..."
echo ""
echo "使用方法:"
echo "  source scripts/load-env.sh"
echo "  または"
echo "  . scripts/load-env.sh"

