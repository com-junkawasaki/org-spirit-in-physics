# GraphQL Service Test Suite

## Test Structure

### Unit Tests (`tests/unit/`)
- `db_connection_test.rs` - Database connection pool tests
- `models_test.rs` - Data model conversion tests
- `constants_test.rs` - Constants and configuration tests
- `hume_client_test.rs` - Hume AI client tests (with mocks)
- `blob_storage_test.rs` - Vercel Blob storage tests (with mocks)
- `activities_test.rs` - GraphQL Query/Mutation tests

### Integration Tests (`tests/integration/`)
- `graphql_api_test.rs` - GraphQL API endpoint tests
- `database_integration_test.rs` - Database integration tests

## Running Tests

### Run all tests
```bash
cargo test
```

### Run unit tests only
```bash
cargo test --test unit_test
```

### Run integration tests only
```bash
cargo test --test integration_test
```

### Run with coverage
```bash
cargo install cargo-tarpaulin
cargo tarpaulin --out Html
```

## Test Coverage Goal

Target: **100% code coverage**

Current coverage can be checked with:
```bash
cargo tarpaulin --out Html --output-dir coverage
```

Open `coverage/tarpaulin-report.html` to view the coverage report.

## Test Dependencies

- `tokio-test` - Async test helpers
- `mockall` - Mock generation
- `wiremock` - HTTP mock server
- `testcontainers` - Test containers (PostgreSQL)

## Notes

- Unit tests use mocks for external dependencies (Hume AI, Vercel Blob)
- Integration tests use testcontainers for database testing
- All tests require `DATABASE_URL` environment variable (or use testcontainers)

