#!/bin/sh
set -e

echo "=== Participant Container Startup ==="

# Check if node_modules exists, install if missing
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.pnpm-lock.yaml" ] 2>/dev/null; then
  echo "node_modules not found or incomplete. Installing dependencies..."
  pnpm install --no-frozen-lockfile || {
    echo "Warning: Failed to install dependencies. Continuing anyway..."
  }
else
  echo "✓ node_modules found"
fi

echo "Waiting for GraphQL API to be ready..."
# Try to connect to GraphQL API (works both in Docker network and host network)
GRAPHQL_URL="${NEXT_PUBLIC_GRAPHQL_RUST_API_URL:-http://graphql:8080/graphql}"
GRAPHQL_BASE_URL=$(echo "$GRAPHQL_URL" | sed 's|/graphql$||')

TIMEOUT=120
ELAPSED=0

# Wait for GraphQL server health check
until curl -f -s "${GRAPHQL_BASE_URL}/health" >/dev/null 2>&1 || [ $ELAPSED -ge $TIMEOUT ]; do
  echo "GraphQL API health check failed - sleeping (${ELAPSED}s/${TIMEOUT}s)"
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
  echo "Error: GraphQL API health check timeout after ${TIMEOUT} seconds"
  exit 1
fi

# Wait for GraphQL API to respond to queries
ELAPSED=0
until curl -f -s -X POST "$GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' >/dev/null 2>&1 || [ $ELAPSED -ge $TIMEOUT ]; do
  echo "GraphQL API is unavailable - sleeping (${ELAPSED}s/${TIMEOUT}s)"
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
  echo "Error: GraphQL API query timeout after ${TIMEOUT} seconds"
  exit 1
fi

echo "GraphQL API is ready!"

# Verify schema contains participantTimeline
echo "Verifying GraphQL schema..."
INTROSPECTION_RESULT=$(curl -s -X POST "$GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -d '{"query":"query { __type(name: \"Query\") { fields { name } } }"}' 2>/dev/null)

if echo "$INTROSPECTION_RESULT" | grep -q "participantTimeline"; then
  echo "✓ Schema verification passed: participantTimeline found"
else
  echo "⚠ Warning: participantTimeline not found in schema"
  echo "Introspection result: $INTROSPECTION_RESULT"
fi

# Wait a bit more for SDL file to be generated
sleep 2

# Check if schema.graphql exists
if [ -f "schema.graphql" ]; then
  echo "✓ schema.graphql found"
  if grep -q "participantTimeline" schema.graphql; then
    echo "✓ participantTimeline found in schema.graphql"
  else
    echo "⚠ Warning: participantTimeline not found in schema.graphql"
  fi
else
  echo "⚠ Warning: schema.graphql not found. Codegen will use introspection."
fi

# Generate GraphQL types
echo "Generating GraphQL types..."
if [ -f "codegen.yaml" ]; then
  if pnpm codegen 2>&1; then
    echo "✓ GraphQL types generated successfully"
  else
    echo "⚠ Warning: Failed to generate GraphQL types. Continuing anyway..."
  fi
else
  echo "⚠ Warning: codegen.yaml not found. Skipping type generation."
fi

# Start the application
echo "Starting application..."
exec "$@"

