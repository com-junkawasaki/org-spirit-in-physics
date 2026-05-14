# Legacy Runtime Archive

Date: 2026-05-14

The active backend runtime is now the Cloudflare Worker API in `apps/api-worker`.
The previous container/process runtime has been moved out of the active source
tree and preserved under `archive/legacy-runtime`.

Archived paths:

- `archive/legacy-runtime/performers/services/api`
- `archive/legacy-runtime/performers/services/importer`
- `archive/legacy-runtime/performers/services/dataset-importer`
- `archive/legacy-runtime/docker-compose.yml`
- `archive/legacy-runtime/generated`
- `archive/legacy-runtime/protobuf-root`
- `archive/legacy-runtime/protobuf-apps`
- `archive/legacy-runtime/lockfiles`

The archived runtime included:

- Go API / ConnectRPC handlers
- Temporal workflow and activity code
- PostgreSQL / TimescaleDB schema and sqlc queries
- Python FastAPI importer and Temporal worker
- local Docker Compose service orchestration
- generated ConnectRPC client descriptors that are no longer imported by the
  Worker REST adapters
- root-level Go/TypeScript protobuf generation outputs and buf configs from the
  archived backend
- stale app-local lockfiles that referenced the archived ConnectRPC toolchain

Use these files only as reference material for endpoint parity or data migration.
New backend work should target:

- `apps/api-worker`
- `apps/api-worker/migrations`
- `apps/api-worker/src/graph`
