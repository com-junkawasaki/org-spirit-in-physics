# Spirit Analyzer - Analysis Pipeline System Performer

Rust implementation of the Analysis Pipeline System Performer for Spirit in Physics.

## Overview

This service implements the Analysis Pipeline as a system performer, calculating spirit probability using the Kawasaki Model from participant response data.

## Architecture

- **Pipeline Engine**: Stage-based execution engine
- **Kawasaki Model**: Spirit probability calculation
- **Supabase Integration**: REST API client for data access
- **HTTP API**: RESTful endpoints for analysis execution

## Pipeline Stages

1. **Data Collection**: Fetch participant data, sessions, and word responses from Supabase
2. **Preprocessing**: Validate and filter data
3. **Analysis**: Calculate spirit probability for each response
4. **Storage**: Save analysis results to Supabase

## Usage

### HTTP API

```bash
# Analyze a participant
curl -X POST http://localhost:3002/analyze \
  -H "Content-Type: application/json" \
  -d '{"participant_id": "uuid-here", "experiment_id": "optional-uuid"}'

# Batch analyze multiple participants
curl -X POST http://localhost:3002/batch-analyze \
  -H "Content-Type: application/json" \
  -d '["uuid-1", "uuid-2"]'

# Health check
curl http://localhost:3002/health
```

### Environment Variables

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Integration

- **GraphQL**: Can be called via `executeActivity` mutation in the Rust GraphQL server
- **Direct HTTP**: REST API endpoints available

## Kawasaki Model

Formula: `SP = f(Word2Vec, Emotion, ReactionTime)`

- **Word2Vec Component**: Semantic similarity (40% weight)
- **Emotion Component**: Emotional valence from Hume AI (40% weight)
- **Reaction Time Component**: Normalized reaction time (20% weight)

