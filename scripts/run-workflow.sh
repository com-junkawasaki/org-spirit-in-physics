#!/bin/bash
# Merkle DAG: workflow_execution_script -> data_import_pipeline
# ワークフロー実行スクリプト

set -e

# デフォルト値
PARTICIPANT_ID="${1:-2a0d7a69-f953-4c29-87a5-8a8e4e8bd413}"
VISUALIZER_URL="${VISUALIZER_URL:-http://localhost:25260}"
DATA_ROOT_PATH="${DATA_ROOT_PATH:-/app/public/dataset}"

echo "=== Visualizer ワークフロー実行 ==="
echo "Participant ID: ${PARTICIPANT_ID}"
echo "Visualizer URL: ${VISUALIZER_URL}"
echo "Data Root Path: ${DATA_ROOT_PATH}"
echo ""

# Visualizerが起動しているか確認
echo "Visualizerの接続を確認中..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s -f "${VISUALIZER_URL}/api/pipeline/import-and-analyze" > /dev/null 2>&1 || \
     curl -s -f "${VISUALIZER_URL}" > /dev/null 2>&1; then
    echo "✓ Visualizerに接続成功"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "接続待機中... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "✗ Visualizerに接続できませんでした"
  echo "docker-compose up が実行されているか確認してください"
  exit 1
fi

# ワークフロー実行
echo ""
echo "ワークフローを実行中..."
RESPONSE=$(curl -s -X POST "${VISUALIZER_URL}/api/pipeline/import-and-analyze" \
  -H "Content-Type: application/json" \
  -d "{
    \"participantId\": \"${PARTICIPANT_ID}\",
    \"dataRootPath\": \"${DATA_ROOT_PATH}\",
    \"dimensions\": 3,
    \"k\": 5,
    \"normalization\": \"trace\",
    \"nonNegativeWeights\": true,
    \"priority\": \"normal\"
  }")

echo "レスポンス:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# ステータス確認
if echo "$RESPONSE" | grep -q '"success".*true'; then
  echo ""
  echo "✓ ワークフローが正常に開始されました"
  echo ""
  echo "進捗確認方法:"
  echo "  curl ${VISUALIZER_URL}/api/pipeline/import-and-analyze?participantId=${PARTICIPANT_ID}"
  echo ""
  echo "ダッシュボード:"
  echo "  ${VISUALIZER_URL}/dashboard"
else
  echo ""
  echo "✗ ワークフローの実行に失敗しました"
  exit 1
fi

