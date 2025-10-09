# Spirit in Physics Backend - Axon Framework Implementation

This is the backend service for the Spirit in Physics research platform, built using Axon Framework with CQRS and Event Sourcing patterns in Kotlin.

## Architecture

The backend implements a CQRS/Event Sourcing architecture using Axon Framework:

### Domain Aggregates
- **Participant**: Manages research participants and their consent
- **ExperimentSession**: Handles experiment sessions and word association responses
- **AnalysisJob**: Orchestrates analysis processing workflows

### Architecture Components
- **Commands**: Write operations that change aggregate state
- **Events**: Immutable facts about what happened in the system
- **Projections**: Read models for querying data
- **Sagas**: Process managers for complex business workflows

### Technology Stack
- **Kotlin**: Primary programming language
- **Spring Boot**: Application framework
- **Axon Framework**: CQRS/Event Sourcing framework
- **Axon Server**: Event store and message routing
- **PostgreSQL**: Primary database (via Supabase)
- **Temporal**: Workflow orchestration for analysis processing
- **JWT**: Authentication and authorization

## Prerequisites

1. **Java 21**
2. **Docker & Docker Compose**
3. **Supabase Project** (for data persistence)
4. **Temporal Server** (for workflow orchestration)

## Quick Start

### 1. Clone and Setup

```bash
cd apps/backend
./gradlew build
```

### 2. Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- Axon Server (ports 8024, 8124)
- PostgreSQL (port 5432)
- Temporal Server (ports 7233, 8233)

### 3. Configure Environment

Create `.env` file or set environment variables:

```bash
# Database
SUPABASE_URL=jdbc:postgresql://localhost:5432/spirit_in_physics
SUPABASE_USERNAME=postgres
SUPABASE_PASSWORD=password

# JWT
JWT_SECRET=your-secret-key-here

# Temporal
TEMPORAL_SERVER_HOST=localhost
TEMPORAL_SERVER_PORT=7233

# Analyzer Temporal (for workflow integration)
ANALYZER_TEMPORAL_URL=http://localhost:8081
```

### 4. Run the Application

```bash
./gradlew bootRun
```

The API will be available at `http://localhost:8080/api`

## API Endpoints

### Participants
- `POST /api/participants` - Create participant
- `GET /api/participants/{id}` - Get participant
- `PUT /api/participants/{id}` - Update participant
- `POST /api/participants/{id}/consent` - Give consent
- `DELETE /api/participants/{id}` - Deactivate participant

### Experiment Sessions
- `POST /api/sessions` - Create experiment session
- `POST /api/sessions/{id}/start` - Start session
- `POST /api/sessions/{id}/responses` - Record word response
- `POST /api/sessions/{id}/complete` - Complete session
- `POST /api/sessions/{id}/media` - Upload session media

### Analysis Jobs
- `GET /api/analysis/{jobId}/status` - Get analysis status
- `GET /api/analysis/{jobId}/result` - Get analysis results

## Event Sourcing

The system uses event sourcing to maintain a complete audit trail:

### Participant Events
- `ParticipantCreatedEvent`
- `ParticipantUpdatedEvent`
- `ParticipantConsentedEvent`
- `ParticipantDeactivatedEvent`

### Session Events
- `ExperimentSessionCreatedEvent`
- `ExperimentSessionStartedEvent`
- `WordResponseRecordedEvent`
- `ExperimentSessionCompletedEvent`
- `SessionMediaUploadedEvent`

### Analysis Events
- `AnalysisJobCreatedEvent`
- `AnalysisJobStartedEvent`
- `AnalysisJobCompletedEvent`
- `AnalysisJobFailedEvent`
- `AnalysisProgressUpdatedEvent`

## CQRS Pattern

### Command Side (Write Model)
Commands are validated and processed by aggregates, producing events.

### Query Side (Read Model)
Events are projected into read-optimized views for querying.

### Projections
- `ParticipantProjection` - Participant read model
- `ExperimentSessionProjection` - Session read model
- `AnalysisJobProjection` - Analysis job read model

## Integration with Analyzer Temporal

The backend integrates with the Python-based `analyzer` service:

1. **Event Trigger**: When an experiment session completes, an `ExperimentSessionCompletedEvent` is published
2. **Workflow Start**: The `AnalysisService` listens for this event and starts a Temporal workflow
3. **Progress Tracking**: Analysis progress is tracked via `AnalysisJob` aggregate
4. **Result Storage**: Completed analysis results are stored and made available via API

## Database Schema

The system uses PostgreSQL with the following tables:

- `participants` - Participant information
- `experiment_sessions` - Session metadata
- `word_responses` - Word association responses
- `analysis_jobs` - Analysis job tracking
- `domain_events` - Axon event store (managed by Axon Server)

## Configuration

### Axon Server
- **HTTP**: http://localhost:8024
- **gRPC**: localhost:8124
- **Dashboard**: http://localhost:8024 (when running)

### Temporal Server
- **gRPC**: localhost:7233
- **UI**: http://localhost:8233

### PostgreSQL
- **Host**: localhost:5432
- **Database**: spirit_in_physics
- **Username**: postgres
- **Password**: password

## Development

### Running Tests
```bash
./gradlew test
```

### Code Style
The project uses Kotlin coding conventions. Format code with:
```bash
./gradlew ktlintFormat
```

### Building Docker Image
```bash
docker build -t spirit-in-physics-backend .
```

## Deployment

### Production Configuration
For production deployment, configure:

1. **Axon Server**: Use AxonIQ Cloud or self-hosted cluster
2. **Database**: Supabase or managed PostgreSQL
3. **Temporal**: Temporal Cloud or self-hosted cluster
4. **Security**: Configure JWT secrets and database credentials

### Environment Variables
```bash
# Axon Server
AXON_AXONSERVER_SERVERS=axon-server-host:8124

# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://prod-db-host:5432/spirit_in_physics
SPRING_DATASOURCE_USERNAME=prod-user
SPRING_DATASOURCE_PASSWORD=prod-password

# Security
JWT_SECRET=production-secret-key
```

## Monitoring

The application exposes health and metrics endpoints:

- **Health**: `GET /actuator/health`
- **Metrics**: `GET /actuator/metrics`
- **Info**: `GET /actuator/info`

Axon Server provides additional monitoring:
- **Dashboard**: Axon Server UI for event processing
- **Temporal UI**: Workflow execution monitoring

## Troubleshooting

### Common Issues

1. **Axon Server Connection**: Ensure Axon Server is running and accessible
2. **Database Connection**: Verify PostgreSQL credentials and connectivity
3. **Temporal Workflow**: Check Temporal Server status and network connectivity
4. **Event Processing**: Monitor Axon Server dashboard for event processing issues

### Logs
Check application logs for detailed error information:
```bash
docker-compose logs backend
```

### Event Store Inspection
Use Axon Server dashboard to inspect events and aggregates:
- http://localhost:8024 (development)
- https://console.axoniq.io (production)
