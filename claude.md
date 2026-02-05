# Spirit in Physics - Claude.md

## Project Overview

Spirit in Physics is a research platform for analyzing emotional responses through neural topology visualization.

## Environment Configuration

### Clerk Authentication

#### Production (spirit-in-physics.com)
```
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuc3Bpcml0LWluLXBoeXNpY3MuY29tJA
CLERK_SECRET_KEY=sk_live_FmyRvnQ0wGXY79hCJnR7hpjuiYWGZSIyM3XbOC4mcL
```

#### Test/Development
```
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y2hhcm1pbmctbW9ua2V5LTQ1LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_AfLugIPlIvAOiBsVLmV89ByDolSfuBrwEiTXs2xRsq
```

## Architecture

### Services (GKE: spirit-in-physics namespace)
- **api**: Go gRPC/Connect service (port 8080)
- **importer**: Python data import service (port 8082)
- **www**: SvelteKit web app
- **portal**: Admin portal
- **researcher**: Researcher dashboard
- **infra-timescaledb**: TimescaleDB (PostgreSQL)

### Database
- **TimescaleDB** on GKE: `postgresql://postgres:postgres@infra-timescaledb:5432/spirit_in_physics`
- Port forward for local access: `kubectl port-forward svc/infra-timescaledb 5433:5432 -n spirit-in-physics`

### Key Tables
- `participants`: User data
- `sessions`: Experiment sessions
- `session_events`: Event log (word_displayed, speech_detected, etc.)
- `timeline_points`: Processed timeline data for visualization
- `timeline_emotion_entries`: Emotion data linked to timeline points
- `hume_face_emotion_data/scores`: Raw Hume AI face emotion data
- `physiological_data`: Physiological measurements (8 channels)

### Materialized Views (must refresh after data import)
```sql
REFRESH MATERIALIZED VIEW timeline_word_aggregates_by_session;
REFRESH MATERIALIZED VIEW timeline_word_statistics_by_session;
REFRESH MATERIALIZED VIEW timeline_emotion_vectors_by_word;
```

## Dataset

### Location
- Git repo: `dataset/participants/`
- External drive backup: `/Volumes/251214/jun784/spirit-in-physics/dataset/`

### Structure
```
dataset/participants/{participant-id}/
├── consent.json
├── session_data.json
├── {date}-{name}.CSV          # Physiological data
├── session-1-video.webm       # (gitignored)
├── session-2-video.webm       # (gitignored)
└── HumeAI_artifacts_{id}/
    ├── HumeAI_predictions_{id}.json
    └── registry_file-{n}-{id}/csv/{id}/
        ├── face.csv
        ├── burst.csv
        ├── language.csv
        └── prosody.csv
```

### Public Researcher IDs (for landing page visualization)
- `e41a9cd2-d803-49a8-9020-0260e55cd03e` (Jun Kawasaki)

## Development

### Local Development
```bash
# Web app
cd apps/web && pnpm run dev

# Full stack with Skaffold
skaffold dev -p local
```

### Deployment
```bash
# Build and push www image (use unique tag to avoid cache issues)
TAG="v$(date +%Y%m%d%H%M%S)"
docker build --platform linux/amd64 --no-cache -t asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/www:$TAG -f apps/web/Dockerfile .
docker push asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/www:$TAG

# Deploy to GKE with specific tag
kubectl set image deployment/www www=asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/www:$TAG -n spirit-in-physics
kubectl rollout status deployment/www -n spirit-in-physics
```

### Data Import
```bash
# Import participant data to production DB
python scripts/local_importer.py \
  --database-url "postgresql://postgres:postgres@localhost:5433/spirit_in_physics" \
  --dataset-path "./dataset/participants" \
  --participant "e41a9cd2-d803-49a8-9020-0260e55cd03e"

# After import, refresh materialized views
```

## Git Configuration

### Gitignored Files
- `*.webm`, `*.mp4`, `*.mov` (video files stored separately)
- `node_modules/`, `.svelte-kit/`, `build/`, `dist/`

### Git Annex (Legacy)
Previously used git-annex for large files. Now migrated to regular git for CSV/JSON, with videos gitignored.

## Frontend Notes

### Threlte (Three.js + Svelte)
- Using Threlte v8 with Svelte 5
- `oncreate` callback receives `ref` directly (not `{ ref }`)
- For `T.ArrowHelper`, use `args` prop instead of `oncreate` for initialization
- For `T.BufferGeometry`, create geometry in script and pass via `<T is={geometry} />`
