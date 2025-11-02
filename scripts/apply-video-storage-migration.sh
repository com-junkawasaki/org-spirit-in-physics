#!/bin/bash
# Supabase Storage動画バケット作成マイグレーション実行スクリプト

set -e

echo "🚀 Supabase Storage動画バケット作成マイグレーションを実行します..."
echo ""

# 環境変数の確認
if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ エラー: DATABASE_URL または SUPABASE_DB_URL が設定されていません"
    echo ""
    echo "以下のいずれかの方法で環境変数を設定してください:"
    echo "1. リモートSupabaseプロジェクトの場合:"
    echo "   export DATABASE_URL='postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres'"
    echo ""
    echo "2. Supabase CLIで接続情報を取得:"
    echo "   supabase db remote commit"
    echo ""
    exit 1
fi

# DATABASE_URLが設定されている場合はそれを使用、なければSUPABASE_DB_URLを使用
DB_URL="${DATABASE_URL:-$SUPABASE_DB_URL}"
MIGRATION_FILE="supabase/migrations/20251102000001_create_video_storage_bucket.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ エラー: マイグレーションファイルが見つかりません: $MIGRATION_FILE"
    exit 1
fi

echo "📋 マイグレーションファイル: $MIGRATION_FILE"
echo "🔗 データベースURL: ${DB_URL:0:30}..."
echo ""

# psqlが利用可能か確認
if ! command -v psql &> /dev/null; then
    echo "❌ エラー: psqlコマンドが見つかりません"
    echo "PostgreSQLクライアントをインストールしてください"
    exit 1
fi

echo "✅ マイグレーションを実行します..."
echo ""

# マイグレーション実行
psql "$DB_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ マイグレーションが正常に完了しました！"
    echo ""
    echo "📦 作成されたバケット: participant-videos"
    echo "🔐 RLSポリシー: Service Role, Admin, Authenticated Users"
    echo ""
    echo "次のステップ:"
    echo "1. Supabaseダッシュボードでバケットが作成されたことを確認"
    echo "2. APIエンドポイント /api/save-artifact で動画アップロードをテスト"
else
    echo ""
    echo "❌ マイグレーションの実行に失敗しました"
    exit 1
fi

