#!/bin/bash
set -e

echo "Waiting for GraphQL API to be ready..."
# Try to connect to GraphQL API (works both in Docker network and host network)
GRAPHQL_URL="${NEXT_PUBLIC_GRAPHQL_RUST_API_URL:-http://graphql:8080/graphql}"
until wget -q --spider "$GRAPHQL_URL" 2>/dev/null || curl -f "$GRAPHQL_URL" >/dev/null 2>&1; do
  echo "GraphQL API is unavailable - sleeping"
  sleep 2
done

echo "GraphQL API is ready!"

# Wait a bit more for SDL file to be generated
sleep 3

# Generate GraphQL types
echo "Generating GraphQL types..."
if [ -f "codegen.yaml" ]; then
  pnpm codegen || npm run codegen || {
    echo "Warning: Failed to generate GraphQL types. Continuing anyway..."
  }
else
  echo "Warning: codegen.yaml not found. Skipping type generation."
fi

# Start the application
exec "$@"

