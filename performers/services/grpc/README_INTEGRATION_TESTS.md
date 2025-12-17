# Integration Tests for Go gRPC Backend

## Overview

This directory contains integration tests for the Go gRPC backend service. These tests verify that:
1. The backend server starts correctly
2. All endpoints are accessible
3. Database connectivity works
4. Services return expected responses

## Prerequisites

1. **Database**: PostgreSQL/TimescaleDB must be running
   ```bash
   docker-compose up -d postgres
   ```

2. **Environment Variables**: Set `DATABASE_URL` if not using defaults
   ```bash
   export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/spirit_in_physics?sslmode=disable"
   ```

## Running Tests

### Go Unit/Integration Tests

```bash
# Run all tests (excluding integration tests)
cd performers/services/grpc
make test

# Run integration tests (requires database)
make test-integration

# Or run directly
go test -tags=integration ./internal/handlers/...
```

### Shell Script Integration Tests

```bash
# Start the backend server first
cd performers/services/grpc
make run

# In another terminal, run the integration test script
./tests/integration_test.sh
```

The script will test:
- Health check endpoint (`/health`)
- Participant Service endpoints
- Session Service endpoints
- Timeline Service endpoints (GetTimeline, GetWordAggregates, GetEmotionVectors, GetWordStatistics)

### Frontend Integration Tests

```bash
# Install dependencies if needed
cd apps/researcher
pnpm install

# Run Vitest tests
pnpm test tests/connect-integration.test.ts
```

## Test Structure

### Backend Tests (`internal/handlers/integration_test.go`)

- `TestHealthCheck`: Verifies health endpoint
- `TestParticipantService`: Tests participant endpoints
- `TestSessionService`: Tests session endpoints
- `TestTimelineService`: Tests timeline endpoints
- `TestDatabaseConnection`: Verifies database connectivity

### Shell Script (`tests/integration_test.sh`)

End-to-end HTTP tests that verify:
- Backend server is running
- All endpoints respond correctly
- Error handling works as expected

### Frontend Tests (`apps/researcher/tests/connect-integration.test.ts`)

TypeScript/Vitest tests that verify:
- Connect RPC client initialization
- Service method calls
- Response parsing
- Error handling

## Troubleshooting

### Database Connection Errors

If tests fail with database connection errors:
1. Ensure PostgreSQL is running: `docker-compose ps`
2. Check `DATABASE_URL` environment variable
3. Verify database exists: `psql -U postgres -d spirit_in_physics`

### Backend Not Running

If shell script tests fail:
1. Start backend: `cd performers/services/grpc && make run`
2. Verify health endpoint: `curl http://localhost:8080/health`
3. Check logs for errors

### Type Errors in Frontend Tests

If TypeScript tests fail:
1. Regenerate Protobuf types: `cd performers/services/grpc && make copy-types`
2. Verify types exist: `ls apps/researcher/src/generated/proto`

## Continuous Integration

These tests should be run in CI/CD pipelines:
1. Before merging PRs
2. After deploying to staging
3. Before production deployments
