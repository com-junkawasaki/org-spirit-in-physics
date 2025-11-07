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

echo "Waiting for Supabase PostgreSQL to be ready..."
TIMEOUT=60
ELAPSED=0
until pg_isready -h host.docker.internal -p 54322 -U postgres -d postgres || [ $ELAPSED -ge $TIMEOUT ]; do
  echo "Supabase PostgreSQL is unavailable - sleeping (${ELAPSED}s/${TIMEOUT}s)"
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
  echo "Warning: PostgreSQL connection timeout. Starting GraphQL server anyway (SDL endpoint will work)."
  echo "Database-dependent features will not work until PostgreSQL is available."
else
  echo "Supabase PostgreSQL is ready!"
fi

# Set DATABASE_URL if not already set
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@host.docker.internal:54322/postgres}"

# Only run database setup if PostgreSQL is available
if pg_isready -h host.docker.internal -p 54322 -U postgres -d postgres 2>/dev/null; then
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

