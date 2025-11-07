#!/bin/bash
# TerminusDB initialization script for test data

set -e

DB_NAME="spirit_kg"
TERMINUS_URL="http://localhost:6363"
ADMIN_USER="admin"
ADMIN_PASS="root"

echo "Initializing TerminusDB with test data..."

# Wait for TerminusDB to be ready
echo "Waiting for TerminusDB to be ready..."
until curl -f -s "${TERMINUS_URL}/api/status" > /dev/null 2>&1; do
    sleep 2
done
echo "TerminusDB is ready!"

# Create database if it doesn't exist
echo "Creating database ${DB_NAME}..."
curl -X POST "${TERMINUS_URL}/api/db/${DB_NAME}" \
    -u "${ADMIN_USER}:${ADMIN_PASS}" \
    -H "Content-Type: application/json" \
    -d '{
        "label": "Spirit Knowledge Graph",
        "comment": "Test database for Great Spirit GPU Physics System"
    }' || echo "Database may already exist"

# Load RDF triples
echo "Loading RDF triples..."
if [ -f "/app/test-data/rdf/sample-triples.ttl" ]; then
    curl -X POST "${TERMINUS_URL}/api/document/${DB_NAME}" \
        -u "${ADMIN_USER}:${ADMIN_PASS}" \
        -H "Content-Type: text/turtle" \
        --data-binary @/app/test-data/rdf/sample-triples.ttl
    echo "RDF triples loaded"
else
    echo "Warning: RDF triples file not found"
fi

# Load SHACL shapes
echo "Loading SHACL shapes..."
if [ -f "/app/test-data/shacl/sample-shapes.ttl" ]; then
    curl -X POST "${TERMINUS_URL}/api/document/${DB_NAME}" \
        -u "${ADMIN_USER}:${ADMIN_PASS}" \
        -H "Content-Type: text/turtle" \
        --data-binary @/app/test-data/shacl/sample-shapes.ttl
    echo "SHACL shapes loaded"
else
    echo "Warning: SHACL shapes file not found"
fi

echo "TerminusDB initialization complete!"

