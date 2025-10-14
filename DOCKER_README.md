# Spirit in Physics - Docker Compose Setup

This document describes how to set up and run the Spirit in Physics application stack using Docker Compose.

## Overview

The application consists of multiple services:

- **Neo4j**: Graph database for all data operations
- **Serverless Workflow SDK**: Workflow orchestration
- **Patient App**: Next.js participant interface (port 25250)
- **Admin App**: Vite admin dashboard (port 4173)
- **Visualizer App**: Next.js data visualization (port 25260)
- **Analyzer**: Python data analysis service (port 8000)
- **Importer**: Python data import service (port 8001)

## Prerequisites

- Docker and Docker Compose
- At least 8GB RAM recommended
- Ports 7474, 7687, 7233, 8233, 25250, 4173, 25260, 8000, 8001 must be available

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
- **Neo4j Browser**: http://localhost:7474
- **Workflow API**: http://localhost:8000/api/workflows

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
1. Databases (Neo4j)
2. Workflow engine (Serverless Workflow SDK)
3. Application services (Patient, Admin, Visualizer)
4. Backend services (Analyzer, Importer)

### Database Initialization

Neo4j database is initialized automatically. Seed data can be imported via the Importer service.

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

### Neo4j
- **Browser URL**: http://localhost:7474
- **Bolt URL**: neo4j://localhost:7687
- **User**: neo4j
- **Password**: neo4jpassword

### Database Connection
- **URI**: neo4j://neo4j:7687 (from within Docker network)
- **Database**: neo4j

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
