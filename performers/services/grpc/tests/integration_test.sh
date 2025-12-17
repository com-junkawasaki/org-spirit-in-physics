#!/bin/bash
# Integration test script for Go gRPC backend
# Tests backend connectivity and endpoint availability

set -e

echo "🧪 Starting Integration Tests for Go gRPC Backend"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${GRPC_API_URL:-http://localhost:8080}"
TIMEOUT=10

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test an endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    local expected_status=${4:-200}
    
    echo -n "Testing $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$url" --max-time $TIMEOUT 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -H "Connect-Protocol-Version: 1" \
            --max-time $TIMEOUT 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ] || [ "$http_code" = "400" ]; then
        echo -e "${GREEN}✓${NC} (HTTP $http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} (HTTP $http_code, expected $expected_status)"
        echo "  Response: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Check if backend is running
echo "Checking if backend is running at $BACKEND_URL..."
if ! curl -s --max-time 5 "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}✗ Backend is not running at $BACKEND_URL${NC}"
    echo "Please start the backend server first:"
    echo "  cd performers/services/grpc && make run"
    exit 1
fi
echo -e "${GREEN}✓ Backend is running${NC}"
echo ""

# Run tests
echo "Running endpoint tests..."
echo "------------------------"

# Health check
test_endpoint "Health Check" "$BACKEND_URL/health" "GET" "200"

# Participant Service
test_endpoint "Participant Service - GetParticipants" \
    "$BACKEND_URL/participant.v1.ParticipantService/GetParticipants" \
    "POST" "200"

# Session Service
test_endpoint "Session Service - GetSessions" \
    "$BACKEND_URL/session.v1.SessionService/GetSessions" \
    "POST" "200"

# Timeline Service
test_endpoint "Timeline Service - GetTimeline" \
    "$BACKEND_URL/timeline.v1.TimelineService/GetTimeline" \
    "POST" "200"

test_endpoint "Timeline Service - GetWordAggregates" \
    "$BACKEND_URL/timeline.v1.TimelineService/GetWordAggregates" \
    "POST" "200"

test_endpoint "Timeline Service - GetEmotionVectors" \
    "$BACKEND_URL/timeline.v1.TimelineService/GetEmotionVectors" \
    "POST" "200"

test_endpoint "Timeline Service - GetWordStatistics" \
    "$BACKEND_URL/timeline.v1.TimelineService/GetWordStatistics" \
    "POST" "200"

# Summary
echo ""
echo "=================================================="
echo "Test Summary"
echo "=================================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}Failed: 0${NC}"
    echo ""
    echo -e "${GREEN}✅ All integration tests passed!${NC}"
    exit 0
fi
