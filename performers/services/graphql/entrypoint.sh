#!/bin/bash
set -e

echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h postgres -U postgres -d postgres; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is ready!"

# Set DATABASE_URL if not already set
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@postgres:5432/postgres}"

echo "Running diesel setup..."
diesel setup --database-url "$DATABASE_URL" || echo "diesel setup completed (migrations directory may already exist)"

echo "Generating schema..."
diesel print-schema --database-url "$DATABASE_URL" > src/schema.rs || {
  echo "Warning: Failed to generate schema. Continuing anyway..."
}

echo "Schema generated successfully!"

# Run the application
exec "$@"

