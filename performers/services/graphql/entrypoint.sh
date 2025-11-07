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

# Run the application
exec "$@"

