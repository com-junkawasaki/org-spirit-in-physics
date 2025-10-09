# Spirit in Physics - System Integration Guide

This document describes the integration between the Axon Framework backend and the Temporal-based analyzer system.

## System Architecture

```
┌─────────────────┐    REST API    ┌──────────────────────┐
│   Patient App   │───────────────▶│  Axon Backend (Kotlin) │
│   (Next.js)     │                │  - CQRS/Event Sourcing │
└─────────────────┘                │  - Participant/Session │
                                   │    Management         │
                                   └──────────────────────┘
                                            │
                                            │ REST API
                                            ▼
┌─────────────────┐    REST API    ┌──────────────────────┐
│  Visualizer     │◀───────────────│  Analyzer Temporal   │
│  (Next.js)      │                │  (Python/Temporal)   │
└─────────────────┘                │  - Hume AI Analysis  │
                                   │  - Kawasaki Model    │
                                   └──────────────────────┘
```

## Integration Points

### 1. Patient App → Backend
- **Purpose**: Experiment participation and data collection
- **API**: REST endpoints for session management
- **Data Flow**: Participant responses → Backend event store

### 2. Backend → Analyzer Temporal
- **Purpose**: Automated analysis workflow execution
- **Integration**: REST API calls to analyzer
- **Trigger**: ExperimentSessionCompletedEvent

### 3. Visualizer → Backend
- **Purpose**: Data visualization and analysis results display
- **API**: `/api/visualizer/*` endpoints for dashboard data
- **Data Flow**: CQRS read models → Frontend components
- **Features**: Dashboard stats, participant correlation analysis, timeline data, timeseries visualization

The Axon Framework backend communicates with analyzer via REST API:

#### Workflow Start
When an experiment session completes, the backend automatically starts analysis:

```kotlin
// backend/src/main/kotlin/com/gftdcojp/spiritinphysics/analysis/AnalysisService.kt
@EventHandler
fun on(event: ExperimentSessionCompletedEvent) {
    // Start Temporal workflow via REST API
    temporalWorkflowClient.startSpiritAnalysisWorkflow(...)
}
```

#### API Endpoints Used
- `POST /api/workflows/start` - Start analysis workflow
- `GET /api/workflows/{id}/status` - Check workflow status
- `GET /api/workflows/{id}/result` - Get analysis results

### 2. Analyzer Temporal → Backend

The analyzer service provides results back to the backend:

#### Result Format
```json
{
  "workflowId": "spirit-analysis-uuid",
  "emotionResults": {...},
  "kawasakiResults": {
    "overall_statistics": {
      "avg_spirit_probability": 0.724
    }
  },
  "reportContent": "...",
  "outputPaths": {
    "analysis_report.md": "/path/to/report",
    "hume_analysis_visualizations.html": "/path/to/viz"
  }
}
```

## Data Flow

1. **Patient completes experiment session** (Next.js app)
2. **Session completion event** published (Axon Framework)
3. **Analysis job created** and workflow started (Axon Backend)
4. **Temporal workflow executes** analysis (Python/Temporal)
5. **Results stored and returned** via REST API
6. **Admin can view results** through backend API

## Deployment

### Using Docker Compose

1. **Create shared network:**
```bash
docker network create spirit-network
```

2. **Start analyzer-temporal:**
```bash
cd apps/analyzer
docker-compose up -d
```

3. **Start backend:**
```bash
cd apps/backend
docker-compose up -d
```

4. **Start patient app:**
```bash
cd apps/patient
pnpm dev
```

### Environment Variables

#### Backend (.env)
```bash
ANALYZER_TEMPORAL_URL=http://analyzer-temporal-api:8081
TEMPORAL_SERVER_HOST=temporal
TEMPORAL_SERVER_PORT=7233
```

#### Analyzer Temporal (config.yaml)
```yaml
temporal:
  host: temporal:7233
  namespace: default
  task_queue: spirit-analysis-queue
```

## API Integration Details

### Starting Analysis from Backend

```kotlin
// When session completes
val workflowId = "${sessionId}-analysis"
temporalWorkflowClient.startSpiritAnalysisWorkflow(
    workflowId = workflowId,
    sessionId = sessionId.toString(),
    parameters = mapOf(
        "stimulus_words" to listOf("head", "green", "water", "death", "mother")
    )
)
```

### Monitoring Analysis Progress

```kotlin
// Check status
val status = temporalWorkflowClient.getWorkflowStatus(workflowId)

// Get results when complete
val results = temporalWorkflowClient.getWorkflowResult(workflowId)
```

## Error Handling

- **Network failures**: Automatic retry with exponential backoff
- **Workflow failures**: Logged and marked as failed in analysis job
- **Invalid responses**: Graceful degradation with error logging
- **Timeout handling**: Configurable timeouts for long-running analyses

## Security Considerations

- **API Authentication**: Add JWT tokens for production
- **Input validation**: Validate all API inputs
- **Rate limiting**: Implement rate limiting for analysis requests
- **Data encryption**: Encrypt sensitive analysis data in transit

## Monitoring & Observability

### Health Checks
- Backend: `GET /actuator/health`
- Analyzer Temporal: `GET /health`
- Temporal Server: Built-in dashboard at `:8233`

### Logs
- Backend: Spring Boot logging
- Analyzer Temporal: Python logging
- Temporal: Server logs and workflow history

### Metrics
- Axon Framework: Event processing metrics
- Temporal: Workflow execution metrics
- Application: Custom business metrics

## Troubleshooting

### Common Issues

1. **Network connectivity:**
   ```bash
   # Check network
   docker network ls
   docker network inspect spirit-network
   ```

2. **Service dependencies:**
   ```bash
   # Check service health
   curl http://localhost:8080/actuator/health
   curl http://localhost:8081/health
   ```

3. **Workflow execution:**
   ```bash
   # Check Temporal UI
   open http://localhost:8233
   ```

4. **Database connectivity:**
   ```bash
   # Check PostgreSQL
   docker exec -it spirit-backend-postgres psql -U postgres -d spirit_in_physics
   ```

## Development Workflow

1. **Make changes** to backend or analyzer-temporal
2. **Rebuild services:**
   ```bash
   cd apps/backend && docker-compose build
   cd apps/analyzer && docker-compose build
   ```
3. **Restart services:**
   ```bash
   docker-compose restart
   ```
4. **Test integration:**
   ```bash
   # Test API endpoints
   curl -X POST http://localhost:8081/api/workflows/start -H "Content-Type: application/json" -d '{"workflowId":"test","sessionId":"test-session","parameters":{}}'
   ```

This integration provides a robust, event-driven architecture for the Spirit in Physics research platform, enabling scalable analysis processing while maintaining clean separation of concerns between the CQRS backend and the Temporal workflow system.
