# Spirit in Physics - Research Process v2.0

This process is for experimental research on spirituality, based on Jung's word association test and computational modeling.

## 🚀 Quick Start

### Prerequisites

1. **PostgreSQL/TimescaleDB Setup**
   - Install PostgreSQL with TimescaleDB extension
   - Ensure the database is running and accessible

2. **GraphQL Service**
   - The GraphQL service should be running on `http://localhost:8081/graphql`
   - See `performers/services/graphql` for GraphQL service setup

3. **Environment Variables**
   ```bash
   # Create .envrc in the project root
   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
   GRAPHQL_API_URL=http://localhost:8081/graphql
   NEXT_PUBLIC_GRAPHQL_API_URL=http://localhost:8081/graphql
   ```

### Installation & Development

```bash
cd apps/participant
pnpm install
pnpm paraglide  # 翻訳ファイルをコンパイル
pnpm codegen    # GraphQL型を生成（初回のみ、またはスキーマ変更時）
pnpm dev
```

### Internationalization (i18n)

This project uses [paraglide-js](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) for internationalization.

**Supported Languages:**
- Japanese (ja) - Default
- English (en)

**Translation Files:**
- `messages/ja.json` - Japanese translations
- `messages/en.json` - English translations

**Usage:**
```typescript
import * as m from '../src/paraglide/messages';

// In your component
<h1>{m.app_title()}</h1>
```

**Adding New Translations:**
1. Add the translation key to both `messages/ja.json` and `messages/en.json`
2. Run `pnpm paraglide` to compile translations
3. Use the generated function in your components

**Language Detection:**
The app automatically detects the user's preferred language from the `Accept-Language` header. Users can also switch languages via URL (e.g., `/en/steps/1` for English).

### GraphQL API

This project uses GraphQL for all data operations. The frontend communicates with the GraphQL service running on port 8081.

**GraphQL Client:**
- Apollo Client is configured in `src/lib/graphql/client.ts`
- GraphQL queries and mutations are defined in `src/lib/graphql/queries.ts` and `src/lib/graphql/mutations.ts`
- React hooks are available in `src/lib/graphql/hooks.ts`

**Available Mutations:**
- `createParticipant` - Create a new participant with consent data
- `createSession` - Create a new session for a participant

**Available Queries:**
- `participants` - Get all participants
- `participant(id)` - Get a participant by ID
- `sessions(participant_id)` - Get sessions for a participant

**Code Generation:**
Run `pnpm codegen` to generate TypeScript types from the GraphQL schema. This should be run whenever the GraphQL schema changes.

## 🏗️ Architecture

This project implements **Hexagonal Architecture + CQRS** pattern with PostgreSQL/TimescaleDB as the primary database:

```
src/
├── 00_schema/            # zod等の型・定数（無依存）
├── 10_events/            # CMD_*/EV_* 列挙（有限語彙）
├── 20_ports/             # 抽象Port（ドメインが依存するだけ）
├── 30_fold/              # 純関数（MDAG -> 投影）※副作用禁止
├── 40_domain/            # xstate machines（UI非依存）
├── 50_adapters/          # RouteHandler/ServerActions/外部API実装
├── 60_projection/        # selectors/ViewModel（foldの薄ラッパ）
├── 70_supervisors/       # ルート単位の調停（invalidate/revalidate）
└── 80_app/               # app/(segments)/...（RSC & Client）
```

### Architecture Rules

- **Dependency Direction**: Higher layers can import from lower layers, but not vice versa
- **Layer Boundaries**: Each layer has a clear responsibility and dependency constraints
- **CQRS Pattern**: Commands and Events are clearly separated and enumerated
- **Pure Functions**: Fold functions are side-effect free and deterministic
- **Port/Adapter Pattern**: Domain depends only on abstract ports, not concrete implementations
- **GraphQL First**: All data operations go through GraphQL API

### Layer Responsibilities

- **00_schema**: Type definitions, schemas, and constants (no dependencies)
- **10_events**: Command and event enumerations (finite vocabulary)
- **20_ports**: Abstract interfaces that domain depends on
- **30_fold**: Pure functions that project MerkleDAG to current state
- **40_domain**: XState machines for business logic (UI-independent)
- **50_adapters**: Concrete implementations of ports (GraphQL client, external services)
- **60_projection**: Selectors and ViewModels (thin wrappers around fold)
- **70_supervisors**: Route-level orchestration (cache invalidation/revalidation)
- **80_app**: Next.js application (RSC & Client components)

## 🚀 Vercel Deployment

This project is configured to deploy on Vercel with Blob Storage for artifact management.

### Prerequisites

- Vercel account
- Vercel CLI installed (`npm i -g vercel`)

### Deployment Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create Vercel project:**
   ```bash
   vercel
   ```
   Follow the prompts to create a new project.

3. **Set up Blob Storage:**
   - Go to your Vercel dashboard
   - Navigate to your project settings
   - Go to "Storage" tab
   - Create a new Blob store
   - Copy the `BLOB_READ_WRITE_TOKEN`

4. **Set environment variables:**
   ```bash
   vercel env add BLOB_READ_WRITE_TOKEN
   vercel env add GRAPHQL_API_URL
   vercel env add NEXT_PUBLIC_GRAPHQL_API_URL
   ```
   Paste the values from step 3 and configure GraphQL API URL.

5. **Deploy:**
   ```bash
   vercel --prod
   ```

### Artifact Migration

If you have existing artifacts in `.artifacts_cache`, migrate them to Blob Storage:

```bash
npm run migrate-artifacts
```

### Environment Variables

- `BLOB_READ_WRITE_TOKEN`: Vercel Blob Storage token (automatically set via Vercel dashboard)
- `GRAPHQL_API_URL`: GraphQL service URL (server-side)
- `NEXT_PUBLIC_GRAPHQL_API_URL`: GraphQL service URL (client-side)

### Blob Storage Structure

Artifacts are stored with the following structure:
```
artifacts/
├── {participantId}/
│   ├── consent/
│   │   └── {id}-consent.json
│   ├── session_data/
│   │   └── {id}-session_data.json
│   ├── video/
│   │   └── {id}-session-{n}-video.webm
│   └── audio/
│       └── {id}-audio.mp3
```

### API Endpoints

**GraphQL API (Primary):**
- All data operations use GraphQL mutations/queries
- GraphQL endpoint: `http://localhost:8081/graphql`
- GraphQL Playground: `http://localhost:8081/graphql/playground`

**REST API (Legacy - Deprecated):**
- `POST /api/save-artifact`: Upload artifacts (videos, audio files) - **Deprecated, use GraphQL mutations**
- `POST /api/save-data`: Save structured data (consent, session data) - **Deprecated, use GraphQL mutations**

**Note:** All data operations should use GraphQL mutations. REST API endpoints are deprecated and will be removed in future versions.
