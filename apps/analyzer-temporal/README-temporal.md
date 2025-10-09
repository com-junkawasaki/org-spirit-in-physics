# Temporal Server Setup

This directory contains the Temporal server setup using Docker Compose for the spirit-in-physics analyzer application.

## Components

- **Temporal Server**: The main Temporal server (port 7233)
- **PostgreSQL**: Database for Temporal persistence (port 5432)
- **Temporal UI**: Web interface for monitoring workflows (port 8080)
- **Admin Tools**: Command-line tools for Temporal management

## Quick Start

1. **Start the Temporal stack:**
   ```bash
   cd apps/analyzer-temporal
   docker-compose up -d
   ```

2. **Verify services are running:**
   ```bash
   docker-compose ps
   ```

3. **Access Temporal UI:**
   Open http://localhost:8080 in your browser

4. **Stop the stack:**
   ```bash
   docker-compose down
   ```

## Development Workflow

### Registering Workers

Once Temporal server is running, you can start your Python workers:

```bash
# From the analyzer-temporal directory
python -m pipeline.job_worker
```

### Starting Workflows

```bash
# Example workflow execution
python -c "
from temporalio.client import Client
from workflows.emotion_analysis_workflow import EmotionAnalysisWorkflow

async def main():
    client = await Client.connect('localhost:7233')
    result = await client.execute_workflow(
        EmotionAnalysisWorkflow.run,
        'session-123',
        id='emotion-analysis-123',
        task_queue='emotion-analysis'
    )
    print(result)

import asyncio
asyncio.run(main())
"
```

## Ports

- **7233**: Temporal server gRPC endpoint
- **5432**: PostgreSQL database
- **8080**: Temporal UI web interface

## Data Persistence

Data is persisted in Docker volumes:
- `temporal_data`: Temporal server data
- `postgresql_data`: PostgreSQL database data

## Troubleshooting

### Check logs
```bash
docker-compose logs temporal
docker-compose logs postgresql
```

### Reset data
```bash
docker-compose down -v  # Removes volumes
docker-compose up -d
```

### Common Issues

1. **Port conflicts**: Make sure ports 7233, 5432, 8080 are available
2. **Permission issues**: Ensure Docker has proper permissions
3. **Memory issues**: Temporal requires adequate memory allocation

## Configuration

The setup uses Temporal's auto-setup image with PostgreSQL as the persistence layer. For production deployments, consider using Temporal Cloud or more advanced configurations.
