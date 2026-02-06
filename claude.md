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

## iOS Mobile App (Capacitor)

### App Identifiers
- **App ID**: `6758669071`
- **Bundle ID**: `com.junkawasaki.spirit-in-physics`
- **App Name**: Spirit in Physics
- **iPhone only** (TARGETED_DEVICE_FAMILY = 1)

### Project Structure
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

### Environment Setup (Required before running Fastlane)
```bash
# Use Homebrew Ruby (system Ruby 2.6 has bundler issues)
export PATH="/opt/homebrew/opt/ruby/bin:/opt/homebrew/lib/ruby/gems/3.4.0/bin:$PATH"

# UTF-8 locale required for CocoaPods
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

### App Store Connect API
- **Key ID**: `62BW4Q57AB`
- **Issuer ID**: `69a6de81-326a-47e3-e053-5b8c7c11a4d1`
- **Key File**: `~/.appstoreconnect/private_keys/AuthKey_62BW4Q57AB.p8`

### Fastlane Commands
```bash
cd apps/mobile/ios

# TestFlight upload (builds web app → cap copy → cocoapods → match → build → upload)
bundle exec fastlane beta

# Submit existing build for App Store review
bundle exec fastlane submit_for_review

# Full release: build + upload + submit for review
bundle exec fastlane full_release

# Metadata management
bundle exec fastlane fetch_metadata
bundle exec fastlane upload_metadata
bundle exec fastlane upload_screenshots
```

### Info.plist Required Keys
- `ITSAppUsesNonExemptEncryption`: `false` (no encryption compliance required)
- `NSMicrophoneUsageDescription`: Voice recording for word association experiment
- `NSCameraUsageDescription`: Facial expression capture for emotion analysis
- `NSPhotoLibraryUsageDescription`: Image save/select for profile and records

### App Privacy Data Types (App Store Connect)
Configured and published in App Store Connect:
- 名前 (Name), メールアドレス (Email), 写真またはビデオ (Photos/Videos)
- オーディオデータ (Audio), ユーザID (User ID), 製品の操作 (Product Interaction)
- All: Purpose=App Functionality+Analytics, Linked to user=Yes, Tracking=No

### Important Notes
- `contentRightsDeclaration` is an **app-level** attribute (not version-level). Set via `PATCH /v1/apps/{appId}`, not `/v1/appStoreVersions/`
- Privacy info must be **published** (公開) in App Store Connect before submission
- App is set to **manual release** after approval
- Price: Free ($0.00)
- Age rating: 4+

## Frontend Notes

### Threlte (Three.js + Svelte)
- Using Threlte v8 with Svelte 5
- `oncreate` callback receives `ref` directly (not `{ ref }`)
- For `T.ArrowHelper`, use `args` prop instead of `oncreate` for initialization
- For `T.BufferGeometry`, create geometry in script and pass via `<T is={geometry} />`
