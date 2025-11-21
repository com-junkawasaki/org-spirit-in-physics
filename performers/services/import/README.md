# Import Service

Python-based import service for spirit-in-physics project.

## Overview

This service provides HTTP endpoints for importing various types of data into PostgreSQL:
- Participants
- Sessions
- Emotions (from CSV files)
- Timeline points (integrated data)

## Architecture

- **Framework**: FastAPI
- **Database**: PostgreSQL (via asyncpg)
- **Port**: 8082

## Endpoints

- `GET /import/status` - Health check
- `POST /import/participants` - Import participants from dataset
- `POST /import/sessions` - Import sessions from dataset
- `POST /import/emotions` - Import emotion data from CSV files
- `POST /import/timeline` - Generate timeline points by integrating data

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (default: `postgresql://postgres:postgres@postgres:5432/spirit_in_physics`)
- `DATASET_PATH` - Path to participants dataset directory (default: `/app/dataset/participants`)
- `PORT` - Server port (default: `8082`)

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python main.py

# Or with uvicorn
uvicorn main:app --host 0.0.0.0 --port 8082
```

## Docker

```bash
# Build
docker build -t import-service .

# Run
docker run -p 8082:8082 \
  -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/spirit_in_physics \
  -e DATASET_PATH=/app/dataset/participants \
  import-service
```

## Migration from Rust

The previous Rust implementation has been replaced with this Python version for better maintainability and easier debugging.
