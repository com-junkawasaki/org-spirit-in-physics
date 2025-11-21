#!/bin/bash
# GraphQL API動作検証スクリプト
# URL: https://graphql.sip.junkawasaki.com/

set +e  # エラーが発生しても続行

BASE_URL="https://graphql.sip.junkawasaki.com"
PASSED=0
FAILED=0

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# テスト結果を記録する関数
test_result() {
    local test_name=$1
    local status=$2
    local message=$3
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name: $message"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $test_name: $message"
        ((FAILED++))
    fi
}

# ヘッダー出力
echo "=========================================="
echo "GraphQL API動作検証"
echo "URL: $BASE_URL"
echo "=========================================="
echo ""

# 1. ヘルスチェック
echo "1. ヘルスチェックエンドポイントの確認"
echo "----------------------------------------"

# /api/health
HTTP_CODE=$(curl -s -o /tmp/health_api.json -w "%{http_code}" "$BASE_URL/api/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    RESPONSE=$(cat /tmp/health_api.json)
    if echo "$RESPONSE" | grep -q '"status":"ok"'; then
        test_result "/api/health" "PASS" "正常に応答 (HTTP $HTTP_CODE)"
        echo "  レスポンス: $RESPONSE"
    else
        test_result "/api/health" "FAIL" "予期しないレスポンス: $RESPONSE"
    fi
else
    test_result "/api/health" "FAIL" "HTTP $HTTP_CODE (期待値: 200)"
    if [ "$HTTP_CODE" != "000" ]; then
        echo "  レスポンス: $(cat /tmp/health_api.json 2>/dev/null || echo 'N/A')"
    fi
fi

# /health
HTTP_CODE=$(curl -s -o /tmp/health.json -w "%{http_code}" "$BASE_URL/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    RESPONSE=$(cat /tmp/health.json)
    if echo "$RESPONSE" | grep -q '"status":"ok"'; then
        test_result "/health" "PASS" "正常に応答 (HTTP $HTTP_CODE)"
    else
        test_result "/health" "FAIL" "予期しないレスポンス: $RESPONSE"
    fi
else
    test_result "/health" "FAIL" "HTTP $HTTP_CODE (期待値: 200)"
fi

echo ""

# 2. GraphQLスキーマ取得
echo "2. GraphQLスキーマ取得の確認"
echo "----------------------------------------"

HTTP_CODE=$(curl -s -o /tmp/schema.txt -w "%{http_code}" "$BASE_URL/api/graphql/schema" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    SCHEMA=$(cat /tmp/schema.txt)
    if echo "$SCHEMA" | grep -q "type Query"; then
        test_result "/api/graphql/schema" "PASS" "スキーマ取得成功 (HTTP $HTTP_CODE)"
        echo "  スキーマサイズ: $(echo "$SCHEMA" | wc -c) bytes"
        echo "  最初の50文字: $(echo "$SCHEMA" | head -c 50)..."
    else
        test_result "/api/graphql/schema" "FAIL" "スキーマ形式が不正"
    fi
else
    test_result "/api/graphql/schema" "FAIL" "HTTP $HTTP_CODE (期待値: 200)"
    if [ "$HTTP_CODE" != "000" ]; then
        echo "  レスポンス: $(cat /tmp/schema.txt 2>/dev/null | head -c 200 || echo 'N/A')"
    fi
fi

echo ""

# 3. GraphQL Introspection
echo "3. GraphQL Introspectionクエリの実行"
echo "----------------------------------------"

INTROSPECTION_QUERY='{"query":"query IntrospectionQuery { __schema { types { name } } }"}'
HTTP_CODE=$(curl -s -o /tmp/introspection.json -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$INTROSPECTION_QUERY" \
    "$BASE_URL/api/graphql" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    RESPONSE=$(cat /tmp/introspection.json)
    if echo "$RESPONSE" | grep -q '"data"'; then
        test_result "Introspection Query" "PASS" "正常に実行 (HTTP $HTTP_CODE)"
        TYPE_COUNT=$(echo "$RESPONSE" | grep -o '"name"' | wc -l | tr -d ' ')
        echo "  検出された型の数: $TYPE_COUNT"
    elif echo "$RESPONSE" | grep -q '"errors"'; then
        test_result "Introspection Query" "FAIL" "GraphQLエラーが発生"
        echo "  エラー: $(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | head -1)"
    else
        test_result "Introspection Query" "FAIL" "予期しないレスポンス形式"
    fi
else
    test_result "Introspection Query" "FAIL" "HTTP $HTTP_CODE (期待値: 200)"
    if [ "$HTTP_CODE" != "000" ]; then
        echo "  レスポンス: $(cat /tmp/introspection.json 2>/dev/null | head -c 200 || echo 'N/A')"
    fi
fi

echo ""

# 4. 基本クエリ実行
echo "4. 基本クエリの実行"
echo "----------------------------------------"

# __typename クエリ
TYPENAME_QUERY='{"query":"query { __typename }"}'
HTTP_CODE=$(curl -s -o /tmp/typename.json -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$TYPENAME_QUERY" \
    "$BASE_URL/api/graphql" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    RESPONSE=$(cat /tmp/typename.json)
    if echo "$RESPONSE" | grep -q '"__typename"'; then
        test_result "__typename Query" "PASS" "正常に実行 (HTTP $HTTP_CODE)"
        echo "  レスポンス: $RESPONSE"
    elif echo "$RESPONSE" | grep -q '"errors"'; then
        test_result "__typename Query" "FAIL" "GraphQLエラーが発生"
        echo "  エラー: $(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | head -1)"
    else
        test_result "__typename Query" "FAIL" "予期しないレスポンス形式"
    fi
else
    test_result "__typename Query" "FAIL" "HTTP $HTTP_CODE (期待値: 200)"
    if [ "$HTTP_CODE" != "000" ]; then
        echo "  レスポンス: $(cat /tmp/typename.json 2>/dev/null | head -c 200 || echo 'N/A')"
    fi
fi

# participants クエリ
PARTICIPANTS_QUERY='{"query":"query { participants { id createdAt } }"}'
HTTP_CODE=$(curl -s -o /tmp/participants.json -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$PARTICIPANTS_QUERY" \
    "$BASE_URL/api/graphql" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    RESPONSE=$(cat /tmp/participants.json)
    if echo "$RESPONSE" | grep -q '"participants"'; then
        test_result "participants Query" "PASS" "正常に実行 (HTTP $HTTP_CODE)"
        PARTICIPANT_COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
        echo "  参加者数: $PARTICIPANT_COUNT"
    elif echo "$RESPONSE" | grep -q '"errors"'; then
        ERROR_MSG=$(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | head -1 | sed 's/"message":"\([^"]*\)"/\1/')
        test_result "participants Query" "FAIL" "GraphQLエラー: $ERROR_MSG"
    else
        test_result "participants Query" "FAIL" "予期しないレスポンス形式"
        echo "  レスポンス: $(echo "$RESPONSE" | head -c 200)"
    fi
else
    test_result "participants Query" "FAIL" "HTTP $HTTP_CODE (期待値: 200)"
    if [ "$HTTP_CODE" != "000" ]; then
        echo "  レスポンス: $(cat /tmp/participants.json 2>/dev/null | head -c 200 || echo 'N/A')"
    fi
fi

echo ""

# 5. CORS設定確認
echo "5. CORS設定の確認"
echo "----------------------------------------"

# OPTIONSリクエスト
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X OPTIONS \
    -H "Origin: https://example.com" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    "$BASE_URL/api/graphql" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
    CORS_HEADERS=$(curl -s -I -X OPTIONS \
        -H "Origin: https://example.com" \
        -H "Access-Control-Request-Method: POST" \
        "$BASE_URL/api/graphql" 2>/dev/null | grep -i "access-control")
    
    if echo "$CORS_HEADERS" | grep -qi "access-control-allow-origin"; then
        test_result "CORS Preflight" "PASS" "CORSヘッダーが設定されています (HTTP $HTTP_CODE)"
        echo "  CORSヘッダー:"
        echo "$CORS_HEADERS" | sed 's/^/    /'
    else
        test_result "CORS Preflight" "FAIL" "CORSヘッダーが設定されていません"
    fi
else
    test_result "CORS Preflight" "FAIL" "HTTP $HTTP_CODE (期待値: 204 or 200)"
fi

echo ""

# 6. エラーハンドリング
echo "6. エラーハンドリングの確認"
echo "----------------------------------------"

# 不正なクエリ
INVALID_QUERY='{"query":"query { invalidField }"}'
HTTP_CODE=$(curl -s -o /tmp/invalid.json -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$INVALID_QUERY" \
    "$BASE_URL/api/graphql" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    RESPONSE=$(cat /tmp/invalid.json)
    if echo "$RESPONSE" | grep -q '"errors"'; then
        test_result "Invalid Query" "PASS" "エラーが適切に返されました (HTTP $HTTP_CODE)"
        ERROR_MSG=$(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | head -1 | sed 's/"message":"\([^"]*\)"/\1/')
        echo "  エラーメッセージ: $ERROR_MSG"
    else
        test_result "Invalid Query" "FAIL" "エラーが返されませんでした"
    fi
else
    test_result "Invalid Query" "FAIL" "HTTP $HTTP_CODE (期待値: 200)"
fi

# 存在しないエンドポイント
HTTP_CODE=$(curl -s -o /tmp/notfound.txt -w "%{http_code}" "$BASE_URL/api/nonexistent" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "404" ]; then
    test_result "404 Not Found" "PASS" "適切に404が返されました (HTTP $HTTP_CODE)"
else
    test_result "404 Not Found" "FAIL" "HTTP $HTTP_CODE (期待値: 404)"
fi

echo ""

# 結果サマリー
echo "=========================================="
echo "検証結果サマリー"
echo "=========================================="
echo -e "${GREEN}成功: $PASSED${NC}"
echo -e "${RED}失敗: $FAILED${NC}"
echo "合計: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}すべてのテストが成功しました！${NC}"
    exit 0
else
    echo -e "${RED}一部のテストが失敗しました。${NC}"
    exit 1
fi

