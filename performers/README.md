# Performers Runtime Archive

The active backend runtime is now `apps/api-worker` on Cloudflare Workers with
D1, R2, and LangGraph Pregel-backed graph execution.

The previous local/container runtime has been moved out of the active tree:

- `archive/legacy-runtime/performers/services/api`
- `archive/legacy-runtime/performers/services/importer`
- `archive/legacy-runtime/performers/services/dataset-importer`
- `archive/legacy-runtime/docker-compose.yml`

Use the archived code only as reference material while finishing endpoint parity
or data migration.
