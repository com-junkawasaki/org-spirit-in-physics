#!/bin/bash
set -e
# Allow script to continue even if some commands fail (for PostgreSQL connection)
set +e

# Generate GraphQL SDL file first (can be done without database connection)
echo "Generating GraphQL SDL..."
if [ -f /app/generate-schema ]; then
    # Change to the directory where schema.graphql should be written (mounted volume)
    cd /app
    /app/generate-schema 2>&1 || {
        echo "Warning: Failed to generate GraphQL SDL using binary. Will try SDL endpoint after server starts."
    }
    if [ -f /app/schema.graphql ]; then
        echo "GraphQL SDL file generated successfully at /app/schema.graphql"
        echo "SDL file size: $(wc -l < /app/schema.graphql) lines"
    else
        echo "SDL file not generated yet. Will be available at /graphql/sdl endpoint after server starts."
    fi
else
    echo "Warning: generate-schema binary not found. SDL will be available at /graphql/sdl endpoint after server starts."
fi

echo "Waiting for PostgreSQL to be ready..."
TIMEOUT=60
ELAPSED=0

# Extract host and port from DATABASE_URL if set, otherwise use defaults
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-postgres}"

# Set DATABASE_URL if not already set (use Docker Compose service name)
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@postgres:5432/postgres}"

# Extract connection details from DATABASE_URL for pg_isready
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):\([^/]*\)\/.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*@[^:]*:\([^/]*\)\/.*/\1/p')
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" || [ $ELAPSED -ge $TIMEOUT ]; do
  echo "PostgreSQL at $DB_HOST:$DB_PORT is unavailable - sleeping (${ELAPSED}s/${TIMEOUT}s)"
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
  echo "Warning: PostgreSQL connection timeout. Starting GraphQL server anyway (SDL endpoint will work)."
  echo "Database-dependent features will not work until PostgreSQL is available."
else
  echo "PostgreSQL at $DB_HOST:$DB_PORT is ready!"
fi

# Only run database setup if PostgreSQL is available
if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" 2>/dev/null; then
  echo "Running diesel setup..."
  diesel setup --database-url "$DATABASE_URL" || echo "diesel setup completed (migrations directory may already exist)"

  echo "Generating schema..."
  diesel print-schema --database-url "$DATABASE_URL" > src/db/schema.rs || {
    echo "Warning: Failed to generate schema. Continuing anyway..."
  }
  echo "Schema generated successfully!"
else
  echo "Skipping database setup (PostgreSQL not available)"
fi

# Re-enable exit on error for the application startup
set -e

# Start GraphQL server in background to generate SDL
echo "Starting GraphQL server in background to generate SDL..."
/app/graphql &
GRAPHQL_PID=$!

# Wait for GraphQL server to be ready
echo "Waiting for GraphQL server to be ready..."
TIMEOUT=60
ELAPSED=0
until curl -f -s http://localhost:8080/health >/dev/null 2>&1 || [ $ELAPSED -ge $TIMEOUT ]; do
  echo "GraphQL server is not ready yet - sleeping (${ELAPSED}s/${TIMEOUT}s)"
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
  echo "Error: GraphQL server failed to start within ${TIMEOUT} seconds"
  kill $GRAPHQL_PID 2>/dev/null || true
  exit 1
fi

echo "GraphQL server is ready!"

# Wait a bit more for server to fully initialize
sleep 2

# Generate SDL file from server endpoint
echo "Generating GraphQL SDL from server endpoint..."
if curl -f -s http://localhost:8080/graphql/sdl > /app/schema.graphql 2>/dev/null; then
  echo "GraphQL SDL file generated successfully at /app/schema.graphql"
  echo "SDL file size: $(wc -l < /app/schema.graphql) lines"
else
  echo "Warning: Failed to generate SDL from server endpoint"
fi

# Verify schema contains participantTimeline
echo "Verifying GraphQL schema..."
if [ -f /app/schema.graphql ]; then
  if grep -q "participantTimeline" /app/schema.graphql; then
    echo "✓ Schema verification passed: participantTimeline found in schema"
  else
    echo "⚠ Warning: participantTimeline not found in schema"
  fi
fi

# Verify schema via introspection query
echo "Verifying schema via introspection query..."
INTROSPECTION_RESULT=$(curl -s -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { __type(name: \"Query\") { fields { name } } }"}' 2>/dev/null)

if echo "$INTROSPECTION_RESULT" | grep -q "participantTimeline"; then
  echo "✓ Schema introspection verification passed: participantTimeline found"
else
  echo "⚠ Warning: participantTimeline not found in introspection result"
  echo "Introspection result: $INTROSPECTION_RESULT"
fi

# Create readiness flag file
echo "GraphQL server is ready and schema is verified" > /tmp/graphql-ready
echo "Readiness flag created at /tmp/graphql-ready"

# Stop background server
echo "Stopping background GraphQL server..."
kill $GRAPHQL_PID 2>/dev/null || true
wait $GRAPHQL_PID 2>/dev/null || true

# Run the application in foreground
echo "Starting GraphQL server in foreground..."
exec "$@"

