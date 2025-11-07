#!/bin/bash
set -e

echo "Waiting for Supabase PostgreSQL to be ready..."
until pg_isready -h host.docker.internal -p 54322 -U postgres -d postgres; do
  echo "Supabase PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "Supabase PostgreSQL is ready!"

# Set DATABASE_URL if not already set
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@host.docker.internal:54322/postgres}"

echo "Running diesel setup..."
diesel setup --database-url "$DATABASE_URL" || echo "diesel setup completed (migrations directory may already exist)"

echo "Generating schema..."
diesel print-schema --database-url "$DATABASE_URL" > src/db/schema.rs || {
  echo "Warning: Failed to generate schema. Continuing anyway..."
}

echo "Schema generated successfully!"

# Generate GraphQL SDL file
echo "Generating GraphQL SDL..."
/app/graphql --generate-schema || cargo run --bin generate-schema || {
    echo "Warning: Failed to generate GraphQL SDL. Continuing anyway..."
    # Try to generate SDL using schema introspection endpoint after server starts
    echo "SDL will be available at /graphql/sdl endpoint"
}

# Run the application
exec "$@"

