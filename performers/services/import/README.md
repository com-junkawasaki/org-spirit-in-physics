# Import Service

Rust-based import service for importing participant, session, and emotion data into Neo4j.

## Features

- **Type-safe imports**: Uses type-level dependencies (`ValidatedSessionId`) to ensure sessions exist before importing emotion data
- **Per-participant transactions**: Each participant is processed in a separate transaction, allowing partial failures
- **Comprehensive error handling**: Detailed error types and logging
- **CSV parsing**: Robust CSV parsing with support for quoted values and commas within values
- **Multiple emotion data types**: Supports burst, face, language, and prosody emotion data

## Architecture

The service uses:
- **neo4rs**: Async Neo4j client for Bolt protocol communication
- **axum**: HTTP server framework
- **tracing**: Structured logging
- **Type-level dependencies**: `ValidatedSessionId` ensures session existence at compile time

## Configuration

Set the following environment variables:

```bash
NEO4J_URI=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4jpassword
NEO4J_DATABASE=neo4j
DATASET_PATH=dataset/participants
```

## API Endpoints

- `POST /import/participants` - Import participant data from consent.json files
- `POST /import/sessions` - Import session data from session_data.json files
- `POST /import/emotions` - Import emotion data from Hume AI artifacts
- `GET /import/status` - Check service status

## Running

```bash
cd performers/services/import
cargo run
```

The service will listen on `0.0.0.0:8082`.

## Type-Level Dependencies

The service uses `ValidatedSessionId` to ensure sessions exist before importing emotion data:

```rust
// This will fail at compile time if session doesn't exist
let validated_session = ValidatedSessionId::from_participant(participant_id, txn).await?;
store_burst_emotion_data(validated_session, record, txn).await?;
```

This prevents the runtime error of trying to import emotion data for non-existent sessions.

