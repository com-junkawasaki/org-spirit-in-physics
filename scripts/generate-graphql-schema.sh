#!/bin/bash
# Generate GraphQL schema SDL from server schema.graphql and copy to client apps
# Schema-first approach: Copy the source of truth schema file

set -e

SCHEMA_SOURCE="${SCHEMA_SOURCE:-performers/services/graphql/schema.graphql}"

if [ ! -f "$SCHEMA_SOURCE" ]; then
    echo "✗ Schema file not found: ${SCHEMA_SOURCE}"
    exit 1
fi

echo "Copying GraphQL schema from ${SCHEMA_SOURCE}..."

# Copy to client apps
cp "${SCHEMA_SOURCE}" apps/researcher/graphql-schema.graphql
cp "${SCHEMA_SOURCE}" apps/unified/graphql-schema.graphql
cp "${SCHEMA_SOURCE}" apps/participant/graphql-schema.graphql

if [ $? -eq 0 ]; then
    echo "✓ GraphQL schema copied to client apps"
    echo "Schema size: $(wc -l < ${SCHEMA_SOURCE}) lines"
    echo ""
    echo "Updated files:"
    echo "  - apps/researcher/graphql-schema.graphql"
    echo "  - apps/unified/graphql-schema.graphql"
    echo "  - apps/participant/graphql-schema.graphql"
else
    echo "✗ Failed to copy GraphQL schema"
    exit 1
fi
