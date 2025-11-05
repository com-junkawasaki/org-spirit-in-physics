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
   NEXT_PUBLIC_RUST_GRAPHQL_URL=http://localhost:3003/graphql
   ```

3. **Database Schema**
   The database schema is managed by Supabase. The main tables are:
   - `participants` - Research participants
   - `participant_experiment_sessions` - Experiment sessions
   - `participant_response_data` - Word association responses
   - `participant_hume_*_predictions` - Emotion analysis results

### Installation & Development

```bash
cd apps/participant
pnpm install
pnpm dev
```

## 🏗️ Architecture

This project implements **GraphQL + Apollo Client** for a type-safe API layer with Rust GraphQL Server and Supabase PostgreSQL as the primary database:

```
src/
├── lib/
│   └── graphql/              # GraphQL client configuration
│       ├── client.ts          # Apollo Client setup
│       ├── queries/           # GraphQL queries
│       ├── mutations/         # GraphQL mutations
│       ├── hooks.ts           # React hooks for GraphQL
│       └── generated/         # Auto-generated types (GraphQL Code Generator)
├── shared/
│   └── schemas/              # Zod schemas (common type definitions)
└── app/                      # Next.js App Router
    ├── api/                  # API routes (deprecated, uses GraphQL internally)
    └── ...                   # Page components
```

### Architecture Principles

- **Type Safety**: End-to-end type safety with GraphQL Code Generator + Apollo Client
- **Simplicity**: No complex abstractions, direct GraphQL queries/mutations
- **Single Source of Truth**: GraphQL schema defines both API contract and types
- **Code Reuse**: Shared GraphQL queries/mutations between components

### Key Components

- **GraphQL Server (Rust)**: Centralized API server using `async-graphql`
- **Apollo Client**: Client-side data fetching and caching
- **GraphQL Code Generator**: Auto-generates TypeScript types from GraphQL schema
- **Supabase Client**: Direct database access via GraphQL server

### Migration Note

The project uses GraphQL + Apollo Client for scalable and type-safe API communication. The GraphQL server is implemented in Rust using async-graphql.

## 🚀 Vercel Deployment

This project is configured to deploy on Vercel with Supabase Storage for artifact management.

### Prerequisites

- Vercel account
- Vercel CLI installed (`npm i -g vercel`)
- Supabase project with Storage configured

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

3. **Set up Supabase Storage:**
   - Go to your Supabase dashboard
   - Navigate to Storage
   - Create a bucket named `participant-videos`
   - Configure public access if needed

4. **Set environment variables:**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add NEXT_PUBLIC_RUST_GRAPHQL_URL
   ```

5. **Deploy:**
   ```bash
   vercel --prod
   ```

### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `NEXT_PUBLIC_RUST_GRAPHQL_URL`: Rust GraphQL server URL (default: `http://localhost:3003/graphql`)

### Storage Structure

Artifacts are stored in Supabase Storage with the following structure:
```
participant-videos/
├── {participantId}/
│   ├── {sessionId}/
│   │   └── {fileName}.webm
```

### API Endpoints

#### GraphQL Endpoints (推奨)

すべてのAPIはGraphQL経由でアクセスできます：

```typescript
import { apolloClient } from '@/lib/graphql/client';
import { CREATE_PARTICIPANT, SAVE_CONSENT, SAVE_SESSION, SAVE_VIDEO } from '@/lib/graphql/mutations';
import { GET_PARTICIPANT, GET_CONSENT, GET_SESSIONS_BY_PARTICIPANT } from '@/lib/graphql/queries';

// Using hooks (recommended)
import { useCreateParticipant, useSaveConsent, useSaveSession, useSaveVideo } from '@/lib/graphql/hooks';

// Or using Apollo Client directly
await apolloClient.mutate({
  mutation: CREATE_PARTICIPANT,
  variables: { input: { age: 30, gender: 'male' } }
});
```

#### Legacy API Endpoints (非推奨)

以下のエンドポイントは後方互換性のため維持されていますが、GraphQLの直接使用を推奨します：

- `POST /api/save-artifact`: Upload artifacts (videos, audio files) - GraphQLを使用
- `POST /api/save-data`: Save structured data (consent, session data) - GraphQLを使用

### GraphQL Schema

The GraphQL schema is defined in the Rust GraphQL server (`apps/graphql-server`). Key operations:

#### Queries
- `participants`: Get all participants
- `participant(id: String!)`: Get participant by ID
- `sessions(participantId: String)`: Get sessions (optionally filtered by participant)
- `sessionsByParticipant(participantId: String!)`: Get sessions for a participant
- `sessionEvents(participantId: String!, sessionId: String!)`: Get session events
- `consent(participantId: String!)`: Get consent information
- `emotionResults(participantId: String!)`: Get emotion analysis results
- `emotionStatistics()`: Get emotion statistics
- `analysisResults(participantId: String, experimentId: String)`: Get analysis results

#### Mutations
- `createParticipant(input: CreateParticipantInput!)`: Create a new participant
- `saveConsent(input: ConsentInput!)`: Save consent information
- `saveSession(input: SaveSessionInput!)`: Save session data (events and word responses)
- `saveVideo(input: SaveVideoInput!)`: Save video file to Supabase Storage
- `analyzeParticipant(participantId: String!, experimentId: String)`: Analyze participant data
- `analyzeAllParticipants()`: Analyze all participants
- `analyzeVideoEmotions(input: AnalyzeVideoInput!)`: Analyze video emotions

### Data Storage

- **Supabase PostgreSQL**: All structured data (participants, sessions, responses, analysis results)
- **Supabase Storage**: Video files, artifacts
- **Supabase Tables**:
  - `participants` - Participant basic information
  - `participant_consents` - Consent information
  - `participant_experiment_sessions` - Experiment sessions
  - `participant_session_events` - Session events (individual records)
  - `participant_response_data` - Word association response data
  - `participant_analysis_results` - Kawasaki Model analysis results
  - `participant_hume_*_predictions` - Hume AI emotion analysis results

## 📝 Development

### GraphQL Code Generation

Generate TypeScript types from the GraphQL schema:

```bash
pnpm codegen
```

This will generate types in `src/lib/graphql/generated/types.ts`.

### Type Safety

The project uses GraphQL Code Generator to generate type-safe hooks and types. After updating GraphQL queries/mutations, run:

```bash
pnpm codegen
```

## 🔧 Troubleshooting

### GraphQL Server Connection

If you encounter connection issues with the GraphQL server:

1. Ensure the Rust GraphQL server is running on port 3003
2. Check `NEXT_PUBLIC_RUST_GRAPHQL_URL` environment variable
3. Verify CORS settings in the GraphQL server

### Type Generation Issues

If GraphQL Code Generator fails:

1. Ensure the GraphQL server is running and accessible
2. Check the schema URL in `codegen.ts`
3. Verify all GraphQL queries/mutations are valid
