#!/bin/bash
# 旧Neo4j関連ファイルの整理スクリプト

set -e

echo "🧹 旧Neo4j関連ファイルの整理を開始します..."
echo ""

# 削除対象ファイル（確認用リスト）
FILES_TO_REVIEW=(
  "apps/visualizer/src/lib/neo4j.ts"
  "apps/visualizer/src/lib/neogma-models.ts"
  "apps/visualizer/src/lib/neo4j-schema.ts"
  "apps/visualizer/src/lib/neo4j-schema-updater.ts"
  "apps/visualizer/src/lib/neo4j-performance-optimizer.ts"
  "apps/visualizer/src/lib/neo4j-use-cases.ts"
  "apps/visualizer/src/lib/neo4j-transaction-manager.ts"
  "apps/visualizer/src/lib/neo4j-guidelines-summary.ts"
  "apps/visualizer/src/lib/neo4j-query-projection.ts"
  "apps/visualizer/src/lib/neo4j-bulk-operations.ts"
  "apps/visualizer/src/lib/neo4j-merge-operations.ts"
  "apps/visualizer/src/lib/neo4j-query-builder.ts"
  "apps/visualizer/src/lib/neo4j-queries.ts"
  "apps/visualizer/src/lib/workflows/neo4j-persistence-workflow.ts"
  "apps/patient/scripts/src/lib/neo4j.ts"
  "apps/patient/scripts/src/lib/import-transaction-manager.ts"
)

ARCHIVE_DIR=".archive/neo4j-files-$(date +%Y%m%d)"

echo "📋 確認対象ファイル:"
for file in "${FILES_TO_REVIEW[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✓ $file"
  else
    echo "   ✗ $file (存在しません)"
  fi
done
echo ""

# アーカイブディレクトリの作成
if [ ! -d "$ARCHIVE_DIR" ]; then
  mkdir -p "$ARCHIVE_DIR"
  echo "📁 アーカイブディレクトリを作成しました: $ARCHIVE_DIR"
fi

# ファイルをアーカイブに移動
MOVED_COUNT=0
for file in "${FILES_TO_REVIEW[@]}"; do
  if [ -f "$file" ]; then
    # ディレクトリ構造を保持
    dir=$(dirname "$file")
    mkdir -p "$ARCHIVE_DIR/$dir"
    mv "$file" "$ARCHIVE_DIR/$file"
    echo "   → $file をアーカイブに移動しました"
    MOVED_COUNT=$((MOVED_COUNT + 1))
  fi
done

if [ $MOVED_COUNT -gt 0 ]; then
  echo ""
  echo "✅ $MOVED_COUNT 個のファイルをアーカイブに移動しました"
  echo "   アーカイブ場所: $ARCHIVE_DIR"
  echo ""
  echo "💡 注意: 後方互換性のため保持されているファイル:"
  echo "   - apps/patient/scripts/src/lib/database/neo4j-manager.ts (エイリアスとして使用)"
else
  echo "ℹ️  移動対象のファイルはありませんでした"
fi

echo ""
echo "📝 READMEファイルを作成中..."
cat > "$ARCHIVE_DIR/README.md" << EOF
# Neo4j関連ファイルアーカイブ

このディレクトリには、Supabase移行時に不要になったNeo4j関連ファイルが保存されています。

## アーカイブ日
$(date)

## ファイル一覧
$(ls -R "$ARCHIVE_DIR" | grep -v "^$" | grep -v "README.md" | sed 's/^/  /')

## 注意事項
- これらのファイルは現在使用されていません
- 将来的に削除を検討できます
- 必要に応じて参照可能です
EOF

echo "✅ アーカイブ完了"
echo ""
echo "🎯 次のステップ:"
echo "   1. アーカイブされたファイルを確認"
echo "   2. 問題がなければ、しばらくしてからアーカイブを削除可能"
echo "   3. 必要に応じて .gitignore に追加を検討"

