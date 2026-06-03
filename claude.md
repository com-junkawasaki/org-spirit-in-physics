# Spirit in Physics - Claude.md

## Project Overview

Spirit in Physics is a research platform for analyzing emotional responses
through neural topology visualization. The active runtime is **Cloudflare
native**: Workers (with static SvelteKit assets), D1, R2, and LangGraph
Pregel inside `apps/api-worker`. The previous GKE / TimescaleDB / Go API
runtime has been archived (see *Architecture history* below).

## Architecture

### Active runtime — Cloudflare

| Component | Source | Cloudflare resource |
| --- | --- | --- |
| Public web app (SvelteKit) | `apps/web` | Worker `spirit-in-physics-web`, custom domains `spirit-in-physics.org` / `www.spirit-in-physics.org` (live; `.com` also bound but its registrar still delegates to dead Google Cloud DNS), `*.workers.dev` URL `spirit-in-physics-web.04-feasts-minded.workers.dev` |
| Researcher dashboard (SvelteKit) | `apps/researcher` | Worker `spirit-in-physics-researcher`, custom domain `researcher.spirit-in-physics.org` (live; `.com` also bound), `*.workers.dev` URL `spirit-in-physics-researcher.04-feasts-minded.workers.dev` |
| API (Hono + LangGraph Pregel + Kysely-D1) | `apps/api-worker` | Worker `spirit-in-physics-api`, zone routes `*.spirit-in-physics.org/api/*` (live; `*.spirit-in-physics.com/api/*` also bound), `*.workers.dev` URL `spirit-in-physics-api.04-feasts-minded.workers.dev` |
| Relational store | `apps/api-worker/migrations` | D1 database `spirit-in-physics` (`f52a6c82-1f2a-444b-9ee6-a241b61bcbe5`), binding `env.DB` |
| Object store (raw artifacts: webm / wav / CSV / Hume JSON) | uploads via `POST /api/storage/upload` | R2 bucket `spirit-in-physics-artifacts`, binding `env.ARTIFACTS` |
| Mobile (iOS / Capacitor wrapper around web app) | `apps/mobile` | Bundle ID `com.junkawasaki.spirit-in-physics`, App ID `6758669071` |

Cloudflare account: `ai-gftd-cloud` (`4da88288dc30d9ee257f319d3c33ecf0`).
**Production domain: `spirit-in-physics.org`** — registered through Cloudflare
Registrar (registrar + authoritative DNS both Cloudflare, zone
`0452956d16bf8ea94fadb4d211e16e52`, NS `everton`/`vivienne`, status `active`).
`spirit-in-physics.com` remains registered at Squarespace (inherited from Google
Domains) and still delegates to the now-dead Google Cloud DNS; it could not be
moved to Cloudflare because the registrar account was inaccessible, so `.org`
was registered fresh instead. The workers keep `.com` custom domains/routes
bound too, but only `.org` resolves publicly. See
[docs/cloudflare-dns-cutover.md](docs/cloudflare-dns-cutover.md) and
[docs/adr-2026-05-17-cloudflare-dns-and-gcp-decommission.md](docs/adr-2026-05-17-cloudflare-dns-and-gcp-decommission.md).

### Architecture history (archived)

- **GKE / namespace `spirit-in-physics`**: deployments, gateway, cert-manager,
  TimescaleDB StatefulSet. Archived under
  [`archive/kubernetes/manifests-old`](archive/kubernetes/manifests-old) and
  [`archive/kubernetes/build-manifests`](archive/kubernetes/build-manifests).
- **Go gRPC API + Python importer + docker-compose**: archived under
  [`archive/legacy-runtime`](archive/legacy-runtime). Documented in
  [docs/legacy-runtime-archive.md](docs/legacy-runtime-archive.md).
- **GCP projects `com-junkawasaki-sip`, `com-junkawasaki-gene`,
  `com-junkawasaki`, `gen-lang-client-0796855340`**: soft-deleted 2026-05-17,
  recoverable with `gcloud projects undelete <id>` for 30 days. Only
  `jun784` GCP project remains.

The historical TimescaleDB schema (`participants`, `sessions`,
`session_events`, `timeline_points`, `hume_face_emotion_data/scores`,
`physiological_data`) is **not** preserved in D1. The active D1 schema lives
in `apps/api-worker/migrations` and the type definitions in
`apps/api-worker/src/db/schema.ts` (`participants`, `sessions`,
`assessment_events`, `artifacts`, plus `graph_runs` / `graph_checkpoints` /
`graph_node_events` per the LangGraph ADR).

## Auth — WebAuthn (passkeys only)

Auth is handled entirely server-side by `apps/api-worker` against the D1
`users` / `webauthn_credentials` / `auth_sessions` / `webauthn_challenges`
tables. No third-party identity provider; no password is ever stored.

Endpoints under `/api/auth/*`:

- `POST /register/options`, `POST /register/verify` — create a user and bind a passkey
- `POST /login/options`, `POST /login/verify` — sign in with an existing passkey
- `POST /logout` — destroy the session
- `GET /me` — return the current user (or `null`)

Client lib: `apps/{web,researcher}/src/lib/auth/client.ts` and
`store.svelte.ts` (Svelte 5 runes reactive store). Components:
`SignInButton`, `SignUpButton`, `UserMenu`, `AuthGuard`, `ResearcherGuard`
under `src/lib/components/auth/`.

Server config:

- `SESSION_SECRET` (≥16 chars) is required. Set via
  `wrangler secret put SESSION_SECRET` for the `spirit-in-physics-api` Worker.
  Used for HMAC-signed session cookies (`sip_session`, HttpOnly, Secure,
  SameSite=Lax, 30-day TTL).
- WebAuthn relying party: `rpID = spirit-in-physics.org` for production
  (works across apex / `www` / `researcher` of `.org`). `rpID =
  spirit-in-physics.com` is still mapped for the `.com` hosts, and `rpID =
  localhost` for local dev. Passkeys are bound to a single registrable domain,
  so `.org` and `.com` credentials are distinct. For `*.workers.dev` previews
  the rpID falls back to the host header, so passkeys registered there don't
  transfer to production.

Roles:

- The first registered user becomes `researcher` automatically; subsequent
  users are `participant`.
- Promote later via `pnpm --dir apps/api-worker wrangler d1 execute spirit-in-physics --remote --command "UPDATE users SET role='researcher' WHERE email='you@example.com';"`.
- `ResearcherGuard` blocks researcher-only pages on the client; reinforce
  with a server-side check on any privileged endpoint you add.

## Dataset

### Location

- Repository samples: `dataset/participants/` (CSV / JSON, no video; videos
  are gitignored)
- External drive backup: `/Volumes/251214/jun784/spirit-in-physics/dataset/`
- Production participant artifacts (recorded after cutover): R2 bucket
  `spirit-in-physics-artifacts`, key pattern
  `{participantId}/session-{n}/{artifactType}/{ts}-{fileName}`

### Repo layout

```
dataset/participants/{participant-id}/
├── consent.json
├── session_data.json
├── {date}-{name}.CSV           # Physiological data
├── session-1-video.webm        # (gitignored)
├── session-2-video.webm        # (gitignored)
└── HumeAI_artifacts_{id}/
    ├── HumeAI_predictions_{id}.json
    └── registry_file-{n}-{id}/csv/{id}/
        ├── face.csv
        ├── burst.csv
        ├── language.csv
        └── prosody.csv
```

### Public researcher IDs (landing-page visualisation)

- `e41a9cd2-d803-49a8-9020-0260e55cd03e` (Jun Kawasaki)

## Development

### Local dev

```bash
# Web (SvelteKit)
pnpm --filter spirit-in-physics-web dev

# Researcher (SvelteKit)
pnpm --filter spirit-in-physics-researcher dev

# API worker (Hono + D1 + R2)
pnpm --dir apps/api-worker dev     # wrangler dev, http://localhost:8787

# Apply D1 schema locally (resets the local SQLite under .wrangler/)
pnpm --dir apps/api-worker db:migrate:local
```

`docker`, `skaffold`, `kubectl`, and any GKE-era tooling are not used by the
active runtime. Anything referencing them belongs in `archive/`.

### Deploy

`apps/*/wrangler.jsonc` pins `account_id` to `4da88288dc30d9ee257f319d3c33ecf0`
so no `CLOUDFLARE_ACCOUNT_ID` env var is needed. A scoped Cloudflare API
token with `Account → Workers Scripts:Edit`, `Zone → Zone:Edit`, `Zone →
DNS:Edit`, `Zone → Workers Routes:Edit` (scoped to `ai-gftd-cloud`) is
sufficient.

```bash
export CLOUDFLARE_API_TOKEN=...

# Build SvelteKit assets first
(cd apps/web        && pnpm build)
(cd apps/researcher && pnpm build)

# Deploy all three workers
(cd apps/api-worker && wrangler deploy)
(cd apps/web        && wrangler deploy)
(cd apps/researcher && wrangler deploy)

# Apply D1 migrations to remote
pnpm --dir apps/api-worker db:migrate:remote
```

A deploy of the api-worker creates the `*.spirit-in-physics.org/api/*` (and
`.com`) zone routes. A deploy of web / researcher provisions the
`custom_domain` bindings (apex / `www` / `researcher` on both `.org` and
`.com`) and the matching proxied AAAA records.

### Data import

The legacy `scripts/local_importer.py` targets the retired GKE TimescaleDB
and is **not** the current import path. New artifacts (webm video, audio,
CSV, Hume JSON) are uploaded via the client → `POST /api/storage/upload` →
R2 + D1 flow:

- Client picks `{participantId, sessionIndex, artifactType, fileName,
  contentType, fileDataBase64}`
- Worker writes the bytes to R2 under
  `{participantId}/session-{n}/{artifactType}/{ts}-{fileName}` and inserts a
  row into D1 `artifacts` with `object_key` + `public_url`
- Public retrieval: `GET /api/storage/object/{key}`

If you need a one-off bulk import from the dataset on disk into D1+R2,
re-implement against `apps/api-worker` rather than reviving the Python
importer.

## Git Configuration

### Gitignored

- `*.webm`, `*.mp4`, `*.mov` (videos stored separately; production videos
  live in R2, not git)
- `node_modules/`, `.svelte-kit/`, `build/`, `dist/`, `.wrangler/`

### git-annex (legacy)

Previously used git-annex for large files. CSV / JSON now live in normal
git; videos are gitignored and stored in R2 in production.

## iOS Mobile App (Capacitor)

### App identifiers

- App ID: `6758669071`
- Bundle ID: `com.junkawasaki.spirit-in-physics`
- App name: Spirit in Physics
- iPhone only (`TARGETED_DEVICE_FAMILY = 1`)

### Project structure

```
apps/mobile/
├── ios/
│   ├── App/
│   │   ├── App.xcworkspace
│   │   ├── App.xcodeproj/
│   │   ├── App/
│   │   │   ├── Info.plist
│   │   │   └── ...
│   │   ├── Podfile
│   │   └── Podfile.lock
│   └── fastlane/
│       ├── Fastfile
│       ├── Appfile
│       ├── Matchfile
│       └── metadata/   # App Store metadata (deliver)
├── capacitor.config.ts
└── package.json
```

### Environment setup (before Fastlane)

```bash
# Use Homebrew Ruby (system Ruby 2.6 has bundler issues)
export PATH="/opt/homebrew/opt/ruby/bin:/opt/homebrew/lib/ruby/gems/3.4.0/bin:$PATH"

# UTF-8 locale required for CocoaPods
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

### App Store Connect API

- Key ID: `62BW4Q57AB`
- Issuer ID: `69a6de81-326a-47e3-e053-5b8c7c11a4d1`
- Key file: `~/.appstoreconnect/private_keys/AuthKey_62BW4Q57AB.p8`

### Fastlane

```bash
cd apps/mobile/ios

# TestFlight upload (builds web app → cap copy → cocoapods → match → build → upload)
bundle exec fastlane beta

# Submit existing build for App Store review
bundle exec fastlane submit_for_review

# Full release: build + upload + submit for review
bundle exec fastlane full_release

# Metadata
bundle exec fastlane fetch_metadata
bundle exec fastlane upload_metadata
bundle exec fastlane upload_screenshots
```

### Info.plist required keys

- `ITSAppUsesNonExemptEncryption`: `false` (no encryption compliance required)
- `NSMicrophoneUsageDescription`: voice recording for the word-association experiment
- `NSCameraUsageDescription`: facial expression capture for emotion analysis
- `NSPhotoLibraryUsageDescription`: image save/select for profile and records

### App privacy data types (App Store Connect)

Configured and published:

- 名前 (Name), メールアドレス (Email), 写真またはビデオ (Photos/Videos),
  オーディオデータ (Audio), ユーザID (User ID), 製品の操作 (Product Interaction)
- All: Purpose = App Functionality + Analytics, Linked to user = Yes, Tracking = No

### iOS publishing notes

- `contentRightsDeclaration` is an **app-level** attribute (not version-level);
  set via `PATCH /v1/apps/{appId}`, not `/v1/appStoreVersions/`.
- Privacy info must be **published (公開)** in App Store Connect before
  submission.
- Release is set to **manual** after approval.
- Price: Free ($0.00). Age rating: 4+.

## Frontend Notes

### Threlte (Three.js + Svelte)

- Threlte v8 with Svelte 5.
- `oncreate` callback receives `ref` directly (not `{ ref }`).
- For `T.ArrowHelper`, use the `args` prop instead of `oncreate` for
  initialisation.
- For `T.BufferGeometry`, create the geometry in script and pass it via
  `<T is={geometry} />`.
