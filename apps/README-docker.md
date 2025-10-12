# Spirit in Physics - Docker Setup

This directory contains Docker Compose configuration for running the entire Spirit in Physics application stack.

## Services Overview

### Infrastructure Services
- **supabase**: Local Supabase instance (PostgreSQL + Auth + Storage + Edge Functions)
- **terminusdb**: Graph database for advanced data relationships
- **temporal**: Workflow orchestration for async processing
- **temporal-db**: PostgreSQL database for Temporal

### Application Services
- **patient**: Next.js patient interface (port 25250)
- **admin**: React admin dashboard (port 3000)
- **visualizer**: Next.js data visualization (port 25260)
- **analyzer**: Python Flask API for analysis (port 8000)
- **importer**: Python data import utilities

## Prerequisites

1. Docker and Docker Compose installed
2. Hume AI API key (for emotion analysis)

## Setup Instructions

1. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file:**
   Replace `your_hume_api_key_here` with your actual Hume AI API key.

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

4. **Check service status:**
   ```bash
   docker-compose ps
   ```

## Service URLs

Once running, access the services at:

- **Patient App**: http://localhost:25250
- **Admin Dashboard**: http://localhost:3000
- **Visualizer**: http://localhost:25260
- **Analyzer API**: http://localhost:8000
- **Supabase Studio**: http://localhost:54323
- **Temporal UI**: http://localhost:8233
- **TerminusDB**: http://localhost:6363

## Environment Variables

### Required
- `HUME_API_KEY`: Your Hume AI API key for emotion analysis

### Optional
All other variables have default values suitable for local development.

## Development Workflow

1. **Start infrastructure:**
   ```bash
   docker-compose up -d supabase terminusdb temporal
   ```

2. **Start applications:**
   ```bash
   docker-compose up -d patient admin visualizer analyzer
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f [service_name]
   ```

4. **Stop services:**
   ```bash
   docker-compose down
   ```

## Database Migrations

Supabase migrations are automatically applied on container startup from the `./supabase/migrations/` directory.

## Troubleshooting

1. **Service won't start:** Check logs with `docker-compose logs [service_name]`
2. **Port conflicts:** Ensure the required ports are available
3. **Database connection issues:** Wait for health checks to pass
4. **Permission issues:** Ensure Docker has proper file system access

## Data Persistence

- Database data is persisted in Docker volumes
- To reset databases: `docker-compose down -v`

## Production Deployment

This configuration is for local development. For production:
1. Use managed Supabase, TerminusDB, and Temporal Cloud services
2. Configure proper environment variables
3. Set up proper networking and security
4. Use production Docker images with multi-stage builds
