# Spirit in Physics - Research Process v2.0

This process is for experimental research on spirituality, based on Jung's word association test and computational modeling.

## 🚀 Quick Start

### Prerequisites

1. **Supabase Setup**
   - Create a Supabase project at https://supabase.com
   - Ensure the database is running and accessible

2. **Environment Variables**
   ```bash
   # Create .env.local in the project root
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Database Schema**
   The database schema is managed by Supabase. The main tables are:
   - `participants` - Research participants
   - `participant_experiment_sessions` - Experiment sessions
   - `participant_response_data` - Word association responses
   - `participant_hume_*_predictions` - Emotion analysis results

### Installation & Development

```bash
cd apps/patient
pnpm install
pnpm dev
```

## 🏗️ Architecture

This project implements **tRPC + Zod** for a simple, type-safe API layer with Supabase PostgreSQL as the primary database:

```
src/
├── server/
│   ├── trpc/              # tRPC設定（context, router）
│   └── api/
│       ├── routers/       # tRPCルーター（participants, sessions, etc.）
│       └── root.ts        # ルートルーター
├── shared/
│   └── schemas/          # Zodスキーマ（共通型定義）
└── app/                   # Next.js App Router
    ├── api/trpc/          # tRPC HTTPハンドラー
    └── ...                # ページコンポーネント
```

### Architecture Principles

- **Type Safety**: End-to-end type safety with Zod + tRPC
- **Simplicity**: No complex abstractions, direct Supabase access
- **Single Source of Truth**: Zod schemas define both validation and types
- **Code Reuse**: Shared schemas between client and server

### Key Components

- **tRPC Routers**: Define API endpoints with Zod validation
- **Zod Schemas**: Single source of truth for data validation and types
- **Supabase Client**: Direct database access (no ORM abstraction)
- **React Query**: Client-side data fetching and caching

### Migration Note

The project previously used Hexagonal Architecture + CQRS, but has been simplified to tRPC + Zod only. See `scripts/src/DEPRECATED_LAYERS.md` for details on deprecated layers.

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
   ```
   Paste the token from step 3.

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

#### tRPC Endpoints (推奨)

すべてのAPIはtRPC経由でアクセスできます：

```typescript
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { AppRouter } from '@/server/api/root';

const client = createTRPCProxyClient<AppRouter>({
  links: [httpBatchLink({ url: '/api/trpc' })],
});

// 参加者管理
await client.participants.list.query();
await client.participants.create.mutate({ age: 30, gender: 'male' });
await client.participants.saveConsent.mutate(consentData);

// セッション管理
await client.sessions.saveSession.mutate(sessionData);
await client.sessions.listByParticipant.query({ participantId });

// アーティファクト管理
await client.artifacts.saveVideo.mutate({ participantId, sessionId, fileName, fileData });

// 分析パイプライン
await client.analysis.analyzeParticipant.mutate({ participantId });
await client.analysis.getResults.query({ participantId });

// 感情分析
await client.emotions.analyzeSingle.mutate({ participantId, videoFile, sessionType });
await client.emotions.getResults.query({ participantId });
```

#### Legacy API Endpoints (非推奨)

以下のエンドポイントは後方互換性のため維持されていますが、tRPCの使用を推奨します：

- `POST /api/save-artifact`: Upload artifacts (videos, audio files) - tRPCを使用
- `POST /api/save-data`: Save structured data (consent, session data) - tRPCを使用

### tRPC Router Structure

```
appRouter
├── participants
│   ├── list (query)
│   ├── create (mutation)
│   ├── getById (query)
│   ├── saveConsent (mutation)
│   └── getConsent (query)
├── sessions
│   ├── saveSession (mutation)
│   ├── listByParticipant (query)
│   └── getEvents (query)
├── artifacts
│   └── saveVideo (mutation)
├── analysis
│   ├── analyzeParticipant (mutation)
│   ├── analyzeAll (mutation)
│   └── getResults (query)
└── emotions
    ├── analyzeSingle (mutation)
    ├── analyzeAll (mutation)
    ├── getResults (query)
    └── getStatistics (query)
```

### Data Storage

- **Supabase PostgreSQL**: すべての構造化データ（参加者、セッション、レスポンス、分析結果）
- **Supabase Storage**: 動画ファイル、アーティファクト
- **Supabase Tables**:
  - `participants` - 参加者基本情報
  - `participant_consents` - 同意情報
  - `participant_experiment_sessions` - 実験セッション
  - `participant_session_events` - セッションイベント（個別レコード）
  - `participant_response_data` - 単語連合応答データ
  - `participant_analysis_results` - Kawasaki Model分析結果
  - `participant_hume_*_predictions` - Hume AI感情分析結果