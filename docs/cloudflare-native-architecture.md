# Cloudflare Native Architecture

Date: 2026-04-12

## Product Choice

As of 2026-04-12, Cloudflare documentation exposes:

- `D1` for SQLite-based relational storage
- `R2` for object storage
- `Durable Objects` for strongly-consistent per-key coordination
- `Queues` and `Workflows` for async execution
- `Hyperdrive` for accelerating access to an external PostgreSQL database

I could not verify any Cloudflare database product named `R1`. I am treating `R1` here as a request to redesign around Cloudflare's current database layer, which means `D1`.

Official docs:

- https://developers.cloudflare.com/d1/
- https://developers.cloudflare.com/r2/
- https://developers.cloudflare.com/durable-objects/
- https://developers.cloudflare.com/queues/
- https://developers.cloudflare.com/workflows/
- https://developers.cloudflare.com/hyperdrive/

## Decision

Archive Kubernetes and redesign the runtime to be Cloudflare-native:

- `apps/web` becomes the primary public frontend on Cloudflare Pages.
- `apps/researcher` becomes either:
  - a second Pages project on `researcher.spirit-in-physics.com`, or
  - another route handled by the same Pages project.
- The archived Go API and Python importer are replaced incrementally by Workers.
- `D1` replaces the current operational database for transactional and queryable metadata.
- `R2` stores binary artifacts, source CSV files, generated media, and large JSON payloads.
- `Durable Objects` own session ingestion and ordered writes where strict sequencing matters.
- `Queues` decouple ingestion from heavy transforms.
- `Workflows` replace long-running importer orchestration.

## Why Not A Direct D1 Port

The current backend is built around PostgreSQL/TimescaleDB behavior:

- Postgres arrays
- `UUID` and `TIMESTAMPTZ` assumptions
- JSONB-heavy queries
- Timescale hypertables
- materialized views for timeline aggregates

Those patterns do not translate directly to D1. D1 is SQLite-based, so the correct move is a data-model redesign, not a mechanical migration.

## New Data Split

### D1: transactional metadata

Keep only query-oriented relational data in D1:

- `participants`
- `consents`
- `sessions`
- `session_events`
- `stimulus_words`
- `artifact_index`
- `aggregate_snapshots`

Recommended shape changes:

- store timestamps as integer epoch milliseconds
- replace array columns with child tables
- replace materialized views with explicitly maintained aggregate tables
- replace UUID-specific assumptions with text ids generated in the application layer

### R2: large objects and append-only artifacts

Move large or blob-oriented data to R2:

- uploaded Hume artifacts
- source CSV files
- audio assets if you want to stop embedding them in DB rows
- exported timeline bundles
- precomputed analytics blobs

Recommended object key layout:

- `participants/{participantId}/sessions/{sessionId}/source/...`
- `participants/{participantId}/sessions/{sessionId}/artifacts/...`
- `participants/{participantId}/sessions/{sessionId}/aggregates/...`

### Durable Objects: write serialization

Use one Durable Object per active session:

- receives ordered reaction/timeline events
- batches writes to D1
- writes raw files and large JSON fragments to R2
- emits async jobs to Queues for secondary analysis

This avoids race conditions that were previously hidden behind a centralized API process and database transaction model.

## New Service Topology

### Pages

- serves the Svelte frontends
- binds to one or more Workers for API calls

### API Worker

Responsibilities:

- participant CRUD
- consent capture
- session lifecycle
- retrieval APIs for frontends
- signed upload URLs or direct R2 write mediation

Bindings:

- D1
- R2
- Durable Objects
- Queues

### Import Worker

Responsibilities:

- consume queued import jobs
- parse CSV / Hume payloads
- write normalized rows into D1
- write large derived payloads to R2
- refresh aggregate snapshot tables

### Analytics Strategy

Do not compute heavy timeline joins on every request.

Instead:

1. raw events land in D1 and R2
2. queue-driven processors update aggregate tables
3. UI reads from `aggregate_snapshots` first
4. deep drill-down fetches per-session bundles from R2 when needed

## Proposed D1 Schema Direction

Core tables:

- `participants(id, email, age_group, ethnicity, income_range, gender, is_public, created_at_ms, updated_at_ms)`
- `participant_medical_history(participant_id, code, label)`
- `consents(id, participant_id, agreements_json, agreed_at_ms, created_at_ms)`
- `sessions(id, participant_id, session_index, start_ts_ms, end_ts_ms, created_at_ms, updated_at_ms)`
- `session_events(id, session_id, event_type, event_timestamp_ms, event_data_json, word_id, reaction_time_ms, created_at_ms)`
- `timeline_points(id, participant_id, session_id, timestamp_ms, word, event_type, reaction_value, reaction_time, has_response, created_at_ms)`
- `timeline_emotions(id, timeline_point_id, emotion_name, score, file_type, created_at_ms)`
- `physiological_measurements(id, timeline_point_id, measurement_type, value, unit, created_at_ms)`
- `artifact_index(id, participant_id, session_id, artifact_type, object_key, content_type, byte_size, public_url, created_at_ms)`
- `aggregate_snapshots(id, participant_id, session_id, aggregate_type, payload_json, first_ts_ms, last_ts_ms, updated_at_ms)`

## Migration Order

1. Freeze Kubernetes as archive-only.
2. Build a new Worker API surface beside the existing apps.
3. Migrate `participants`, `consent`, and `sessions` to D1 first.
4. Move artifact uploads to R2.
5. Move timeline ingestion behind Durable Objects + Queues.
6. Rebuild analytics views as precomputed aggregates.
7. Cut Pages routes over to the Worker API.
8. Remove the old Go/Python runtime once parity is reached.

## What Was Archived

The old Kubernetes/GKE assets were moved under [`archive/kubernetes`](/Users/junkawasaki/github/spirit-in-physics/archive/kubernetes).

This includes:

- `manifests`
- `config-sync`
- `skaffold.yaml`
- GKE / ACM / Envoy bootstrap YAMLs

## Practical Constraint

If you need strict PostgreSQL compatibility immediately, the transitional option is:

- keep PostgreSQL elsewhere
- put Cloudflare in front
- use `Hyperdrive`

If the requirement is to eliminate Kubernetes now, then the cleaner target is a true redesign around `D1 + R2 + Durable Objects`, not a lift-and-shift.
