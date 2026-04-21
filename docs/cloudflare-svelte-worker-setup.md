# Cloudflare Svelte + Worker Setup

This repository now has a first Cloudflare-native application split:

- [`apps/web`](/Users/junkawasaki/github/spirit-in-physics/apps/web): SvelteKit frontend for Cloudflare
- [`apps/researcher`](/Users/junkawasaki/github/spirit-in-physics/apps/researcher): SvelteKit frontend for Cloudflare
- [`apps/api-worker`](/Users/junkawasaki/github/spirit-in-physics/apps/api-worker): minimal Cloudflare Worker API scaffold

## Current State

- Svelte apps are configured for `@sveltejs/adapter-cloudflare`.
- `PUBLIC_API_MODE=worker-partial` is the default.
- The Worker API currently implements:
  - `GET /api/health`
  - `GET /api/capabilities`
  - `GET /api/participants`
  - `GET /api/participants/by-email`
  - `POST /api/participants`
  - `GET /api/stimulus-words`
  - `GET /api/sessions`
  - `POST /api/storage/upload`
  - `POST /api/assessments/start`
  - `POST /api/assessments/session-start`
  - `POST /api/assessments/word-response`
  - `POST /api/assessments/artifact`
  - `POST /api/assessments/complete`
- Legacy Go/Python endpoints are not yet ported.

## Next Implementation Step

Port these APIs in order:

1. timeline aggregates for researcher views
2. preferences
3. imports
4. direct browser-to-R2 uploads with presigned URLs

## D1 Bootstrap

Create the D1 database, then apply the versioned migrations in [`apps/api-worker/migrations`](/Users/junkawasaki/github/spirit-in-physics/apps/api-worker/migrations).

- Local: `pnpm --filter api-worker db:migrate:local`
- Remote: `pnpm --filter api-worker db:migrate:remote`

## Bindings

- `DB`: D1 database
- `ARTIFACTS`: R2 bucket
