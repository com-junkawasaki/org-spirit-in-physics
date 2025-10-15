# Spirit in Physics Pipeline - Microservices Architecture

## Overview

The Spirit in Physics Pipeline has been refactored from a monolithic application into a microservices architecture. This provides better scalability, maintainability, and fault isolation.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │   Patient App   │    │  Visualizer App │
│     (Port 8000) │    │   (Port 25250)  │    │   (Port 25260)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                        │                   │
          └────────────────────────┼───────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │     Workflow Orchestrator   │
                    │         (Port 8003)        │
                    └─────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
          ┌─────────┴─────────┐  ┌─┴─────────┐  ┌─┴─────────┐
          │  Data Ingestion  │  │Analysis   │  │  Storage  │
          │   (Port 8001)    │  │ Engine    │  │ Adapter   │
          │                  │  │(Port 8002)│  │(Port 8004)│
          └──────────────────┘  └───────────┘  └───────────┘
                                   │              │
                                   └──────────────┘
                                          │
                                ┌─────────┴─────────┐
                                │     Neo4j DB      │
                                │   (Port 7687)    │
                                └───────────────────┘
```

## Services

### 1. API Gateway (`pipeline`)
- **Port**: 8000
- **Purpose**: Unified entry point for all pipeline operations
- **Routes requests** to appropriate microservices
- **Provides backward compatibility** with existing clients

### 2. Data Ingestion Service
- **Port**: 8001
- **Purpose**: Handle data ingestion and preprocessing
- **Features**:
  - Participant data ingestion
  - Experiment session data
  - Physiological data processing
  - Batch file processing

### 3. Analysis Engine Service
- **Port**: 8002
- **Purpose**: Provide analysis algorithms
- **Features**:
  - Kawasaki model analysis
  - Hume AI emotion analysis
  - Physiological data processing
  - Feature extraction

### 4. Workflow Orchestrator Service
- **Port**: 8003
- **Purpose**: Manage workflow definitions and execution
- **Features**:
  - Workflow definition management
  - Asynchronous workflow execution
  - State management
  - Error handling

### 5. Storage Adapter Service
- **Port**: 8004
- **Purpose**: Data access layer for Neo4j database
- **Features**:
  - Participant data queries
  - Session data management
  - Analysis results storage
  - Job and workflow execution tracking

## Shared Libraries

### libs/shared/
- **config.py**: Centralized configuration management
- **models.py**: Common data models and enums
- **utils.py**: Utility functions and error handling

### libs/models/
- **schemas.py**: Pydantic schemas for API validation

### libs/workflows/
- **definitions.py**: Workflow definitions and specifications

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Python 3.11+
- Node.js (for frontend apps)

### Environment Variables
Create a `.env` file in the project root with:
```
HUME_API_KEY=your-hume-api-key
```

### Running the Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Service URLs
- **API Gateway**: http://localhost:8000
- **Data Ingestion**: http://localhost:8001
- **Analysis Engine**: http://localhost:8002
- **Workflow Orchestrator**: http://localhost:8003
- **Storage Adapter**: http://localhost:8004
- **Patient App**: http://localhost:25250
- **Visualizer App**: http://localhost:25260
- **Neo4j Browser**: http://localhost:7474

## API Endpoints

### Health Checks
```bash
# Check all services health
curl http://localhost:8000/api/health/services
```

### Workflow Management
```bash
# List workflows
curl http://localhost:8000/api/workflows

# Execute workflow
curl -X POST http://localhost:8000/api/workflows/unified-pipeline/execute \
  -H "Content-Type: application/json" \
  -d '{"data": {"participantId": "test"}}'

# Start participants import workflow
curl -X POST http://localhost:8000/api/workflows/start-participants-import

# Check participants import status
curl http://localhost:8000/api/import/participants/status
```

### Participants Data Import

The system includes a specialized workflow for importing participant data from the `dataset/participants/` directory. Each participant directory should contain:

- `consent.json` - Participant consent and basic information
- `session_data.json` - Experiment session data
- `*.CSV` files - Physiological data (GSR, heart rate, etc.)
- `*.webm` files - Video recordings
- `HumeAI_artifacts_*/` - Pre-computed Hume AI analysis results

#### Import Process Flow

1. **Scan Participants Directory**: Automatically discovers participant directories
2. **Import Participants**: Reads `consent.json` and creates participant records
3. **Process Sessions**: Reads `session_data.json` and creates session records
4. **Import Physiological Data**: Processes CSV files for physiological measurements
5. **Import Video Data**: Catalogs video files (metadata only)
6. **Import Hume Analysis**: Processes pre-computed Hume AI emotion analysis
7. **Finalize Import**: Generates import summary and reports

#### Manual Import Endpoints

Individual components can also be imported manually:

```bash
# Scan participants directory
curl http://localhost:8000/api/data-ingestion/import/scan-participants

# Import specific participant
curl -X POST http://localhost:8000/api/data-ingestion/import/participant \
  -H "Content-Type: application/json" \
  -d '{"participant_dir": "/app/dataset/participants/144b325f-5966-4d59-a629-f2ca421388cc"}'
```

### Data Operations
```bash
# Ingest participant
curl -X POST http://localhost:8000/api/data-ingestion/ingest/participant \
  -H "Content-Type: application/json" \
  -d '{"id": "p001", "name": "Test Participant"}'

# Run analysis
curl -X POST http://localhost:8000/api/analysis-engine/analyze/kawasaki \
  -H "Content-Type: application/json" \
  -d '{"session_id": "session-001"}'
```

## Development

### Adding New Services
1. Create service directory under `services/`
2. Add Dockerfile and requirements.txt
3. Implement FastAPI application
4. Update docker-compose.yml
5. Add routing in API Gateway if needed

### Service Communication
Services communicate via HTTP using httpx library. Each service should:
- Handle its own domain logic
- Provide RESTful APIs
- Use shared libraries for common functionality
- Log operations appropriately

### Testing
```bash
# Run tests for a specific service
cd services/data-ingestion
python -m pytest

# Run integration tests
docker-compose -f docker-compose.test.yml up
```

## Monitoring and Logging

- All services use structured logging
- Health checks available at `/health` endpoint
- Service metrics can be collected via `/metrics` (future enhancement)
- Logs are available via `docker-compose logs`

## Migration from Monolithic

The API Gateway provides backward compatibility with the previous monolithic API. Existing clients can continue to work without changes while new features can leverage the microservices architecture.

## Contributing

1. Follow the established patterns in existing services
2. Use shared libraries for common functionality
3. Add comprehensive error handling
4. Update documentation for new endpoints
5. Ensure services are stateless where possible
