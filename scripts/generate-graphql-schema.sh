#!/bin/bash
# Generate GraphQL schema SDL from Rust service and save to file

set -e

GRAPHQL_API_URL="${GRAPHQL_API_URL:-http://localhost:8081/graphql/schema}"
SCHEMA_OUTPUT="${SCHEMA_OUTPUT:-apps/researcher/schema.graphql}"

echo "Fetching GraphQL schema from ${GRAPHQL_API_URL}..."

# Fetch schema
curl -s "${GRAPHQL_API_URL}" > "${SCHEMA_OUTPUT}"

if [ $? -eq 0 ]; then
    echo "✓ GraphQL schema saved to ${SCHEMA_OUTPUT}"
    echo "Schema size: $(wc -l < ${SCHEMA_OUTPUT}) lines"
else
    echo "✗ Failed to fetch GraphQL schema"
    exit 1
fi

