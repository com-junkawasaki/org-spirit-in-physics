# Spirit in Physics - Docker Compose Setup

This document describes how to set up and run the Spirit in Physics application stack using Docker Compose.

## Overview

The application consists of multiple services:

- **ArangoDB**: Multi-model database for all data operations
- **Temporal**: Workflow orchestration
- **Patient App**: Next.js participant interface (port 25250)
- **Admin App**: Vite admin dashboard (port 4173)
- **Visualizer App**: Next.js data visualization (port 25260)
- **Analyzer**: Python data analysis service (port 8000)
- **Importer**: Python data import service (port 8001)

## Prerequisites

- Docker and Docker Compose
- At least 8GB RAM recommended
- Ports 8529, 7233, 8233, 25250, 4173, 25260, 8000, 8001 must be available

## Quick Start

1. **Clone and navigate to the project:**
   ```bash
   cd /Users/junkawasaki/jun784/spirit-in-physics
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Check service status:**
   ```bash
   docker-compose ps
   ```

4. **View logs:**
   ```bash
   docker-compose logs [service-name]
   ```

## Service URLs

Once all services are running:

- **Patient App**: http://localhost:25250
- **Admin Dashboard**: http://localhost:4173
- **Visualizer**: http://localhost:25260
- **ArangoDB**: http://localhost:8529
- **Temporal UI**: http://localhost:8233

## Environment Configuration

Each service uses environment files:

- `apps/patient/env.docker` - Patient app configuration
- `apps/admin/env.docker` - Admin app configuration
- `apps/visualizer/env.docker` - Visualizer app configuration
- `apps/analyzer/env.docker` - Analyzer service configuration
- `apps/importer/env.docker` - Importer service configuration

## Troubleshooting

### Port Conflicts

If you encounter port conflicts, modify the ports in `docker-compose.yml`:

```yaml
# Example: Change patient app port
patient:
  ports:
    - "25251:3000"  # Changed from 25250
```

### Service Dependencies

Services start in dependency order:
1. Databases (Supabase, TerminusDB)
2. Workflow engine (Temporal)
3. Application services (Patient, Admin, Visualizer)
4. Backend services (Analyzer, Importer)

### Database Initialization

Supabase database is initialized with migrations from `supabase/migrations/`. The seed data is loaded from `supabase/seed.sql`.

### Building Services

To rebuild a specific service:

```bash
docker-compose build [service-name]
```

To rebuild all services:

```bash
docker-compose build
```

## Development Workflow

1. **Make code changes** in the respective `apps/` directories
2. **Rebuild services** as needed: `docker-compose build [service]`
3. **Restart services**: `docker-compose restart [service]`
4. **Check logs**: `docker-compose logs -f [service]`

## Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: This deletes data!)
docker-compose down -v
```

## Database Access

### Supabase
- **Host**: localhost:15432
- **Database**: postgres
- **User**: postgres
- **Password**: postgres

### TerminusDB
- **URL**: http://localhost:6363
- **User**: admin
- **Password**: root

## API Endpoints

### Patient App
- Main interface: http://localhost:25250

### Admin Dashboard
- Admin interface: http://localhost:4173

### Visualizer
- Data visualization: http://localhost:25260

### Analyzer Service
- API: http://localhost:8000

### Importer Service
- API: http://localhost:8001

## Performance Notes

- **Memory**: Each service may consume 500MB-1GB RAM
- **Disk**: Database volumes may grow significantly with data
- **CPU**: Analysis services benefit from multiple cores

## Security

- Services communicate via Docker network
- External access is limited to specified ports
- Database credentials are for development only

## Support

For issues with specific services, check their individual README files in the `apps/` directories.
