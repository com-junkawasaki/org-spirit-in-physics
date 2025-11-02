#!/bin/bash
# APIエンドポイントの動作確認スクリプト

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
PATIENT_BASE_URL="${PATIENT_BASE_URL:-http://localhost:25250}"
VISUALIZER_BASE_URL="${VISUALIZER_BASE_URL:-http://localhost:3000}"

echo "🧪 APIエンドポイントの動作確認を開始します..."
echo ""

# カラー出力用
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SUCCESS=0
FAILED=0

test_endpoint() {
    local method=$1
    local url=$2
    local description=$3
    local expected_status=${4:-200}
    local data=$5

    echo -n "  テスト: $description ... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url" || echo -e "\n000")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$url" || echo -e "\n000")
    else
        echo -e "${RED}❌ 未対応のHTTPメソッド: $method${NC}"
        FAILED=$((FAILED + 1))
        return
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ 成功 (HTTP $http_code)${NC}"
        SUCCESS=$((SUCCESS + 1))
    else
        echo -e "${RED}❌ 失敗 (HTTP $http_code, 期待値: $expected_status)${NC}"
        echo "  レスポンス: $body" | head -c 200
        echo ""
        FAILED=$((FAILED + 1))
    fi
}

echo "📋 Visualizer App API エンドポイント"
echo "======================================"

# Visualizer App
test_endpoint "GET" "$VISUALIZER_BASE_URL/api/participants" "参加者一覧取得"
test_endpoint "GET" "$VISUALIZER_BASE_URL/api/dashboard-stats" "ダッシュボード統計取得"
test_endpoint "GET" "$VISUALIZER_BASE_URL/api/analysis-report" "分析レポート取得"

# テスト用の参加者IDが存在する場合のみ
if [ -n "$TEST_PARTICIPANT_ID" ]; then
    test_endpoint "GET" "$VISUALIZER_BASE_URL/api/participants/$TEST_PARTICIPANT_ID/timeline" "参加者タイムライン取得"
    test_endpoint "GET" "$VISUALIZER_BASE_URL/api/participants/$TEST_PARTICIPANT_ID/word2vec" "Word2Vecデータ取得"
fi

echo ""
echo "📋 Patient App API エンドポイント"
echo "=================================="

# Patient App
test_endpoint "GET" "$PATIENT_BASE_URL/api/admin/experimental-data?type=participants" "実験データ取得 (participants)"
test_endpoint "GET" "$PATIENT_BASE_URL/api/admin/experimental-data?type=analytics" "実験データ取得 (analytics)"

# 非推奨エンドポイントの確認
echo ""
echo "📋 非推奨エンドポイント確認"
echo "=========================="
test_endpoint "POST" "$VISUALIZER_BASE_URL/api/pipeline/save-to-neo4j" "非推奨エンドポイント (410期待)" "410" '{"participantId":"test"}'

echo ""
echo "📊 テスト結果サマリー"
echo "===================="
echo -e "${GREEN}✅ 成功: $SUCCESS${NC}"
echo -e "${RED}❌ 失敗: $FAILED${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ 一部のテストが失敗しました${NC}"
    exit 1
else
    echo -e "${GREEN}✅ 全てのテストが成功しました${NC}"
    exit 0
fi

