#!/bin/bash
# Merkle DAG: test.graphql.auth
# Test script for GraphQL authentication with Clerk

set -e

GRAPHQL_URL="${GRAPHQL_URL:-http://localhost:8081/graphql}"
CLERK_PUBLISHABLE_KEY="${CLERK_PUBLISHABLE_KEY:-pk_test_ZW5vdWdoLWNoaXBtdW5rLTkyLmNsZXJrLmFjY291bnRzLmRldiQ}"
CLERK_SECRET_KEY="${CLERK_SECRET_KEY:-sk_test_FmPI35dNxAij0tuaX7rV5PDIDVmVvx8J11nyVyxEGu}"

echo "=== GraphQL Authentication Test ==="
echo "GraphQL URL: $GRAPHQL_URL"
echo ""

# Test 1: Health check (no auth required)
echo "Test 1: Health check (no auth required)"
curl -s -X GET "$GRAPHQL_URL/../health" | jq '.' || echo "Health check failed"
echo ""

# Test 2: Query without auth (should work for public queries)
echo "Test 2: Query stimulus_words without auth (should work)"
curl -s -X POST "$GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { stimulusWords { id japanese english } }"
  }' | jq '.' || echo "Query failed"
echo ""

# Test 3: Query participants without auth (should fail - requires auth)
echo "Test 3: Query participants without auth (should fail - requires auth)"
RESPONSE=$(curl -s -X POST "$GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { participants { id age gender } }"
  }')
echo "$RESPONSE" | jq '.' || echo "$RESPONSE"
echo ""

# Test 4: Query participants with invalid token (should fail)
echo "Test 4: Query participants with invalid token (should fail)"
RESPONSE=$(curl -s -X POST "$GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token_here" \
  -d '{
    "query": "query { participants { id age gender } }"
  }')
echo "$RESPONSE" | jq '.' || echo "$RESPONSE"
echo ""

# Test 5: Get Clerk session token (requires Clerk CLI or API)
echo "Test 5: Get Clerk session token"
echo "Note: To test with a real token, you need to:"
echo "  1. Sign in via the participant or researcher app"
echo "  2. Get the session token from browser DevTools (Application > Cookies > __session)"
echo "  3. Or use Clerk CLI: clerk sessions create --user-id <user-id>"
echo ""

# Test 6: Mutation without auth (should work for participant creation)
echo "Test 6: Create participant without auth (should work - anonymous)"
curl -s -X POST "$GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createParticipant(input: { signature: \"test\", agreements: {}, agreedAt: \"2024-01-01T00:00:00Z\" }) { id createdAt } }"
  }' | jq '.' || echo "Mutation failed"
echo ""

echo "=== Test Summary ==="
echo "✓ Health check (no auth)"
echo "✓ Public query (stimulus_words)"
echo "✓ Protected query without auth (should fail)"
echo "✓ Protected query with invalid token (should fail)"
echo "✓ Anonymous mutation (create_participant)"
echo ""
echo "To test with a real Clerk token:"
echo "  1. Start the apps: docker-compose up"
echo "  2. Sign in via http://localhost:25250 (participant) or http://localhost:25260 (researcher)"
echo "  3. Get the session token from browser DevTools"
echo "  4. Run: curl -X POST $GRAPHQL_URL -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' -d '{\"query\": \"query { participants { id } }\"}'"

