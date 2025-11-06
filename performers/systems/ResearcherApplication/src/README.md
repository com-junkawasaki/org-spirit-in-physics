# Spirit in Physics - Visualizer

## Supabase Database

This visualizer uses **Supabase PostgreSQL** as the primary database.

## Key Features

### Client Library (`src/lib/supabase.ts`)
- Supabase JavaScript client with query builder
- Type-safe data access layer

### API Routes (`src/app/api/`)
- Supabase queries in API routes
- Efficient relational queries

### Data Functions (`src/lib/data.ts`)
- Supabase server client queries
- SupabaseManager for unified data access

## Supabase Client Features

### Participants Query
```typescript
async getParticipants(): Promise<any[]> {
  const { data } = await client
    .from('participant_summary')
    .select('*')
    .order('participant_created_at', { ascending: false })
  // Returns processed participant data
}
```

### Participant Details Query
```typescript
async getParticipantDetails(participantId: string): Promise<any> {
  const { data: sessions } = await client
    .from('participant_experiment_sessions')
    .select('*')
    .eq('participant_id', participantId)
  // Returns participant sessions and responses
}
```

## Configuration

Add to your environment variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_RUST_GRAPHQL_URL=http://localhost:25263/graphql
```

## GraphQL Architecture

このプロジェクトは**Rust実装のGraphQLサーバーのみ**を使用します。

- **GraphQLサーバー**: `performers/services/graphql/GraphQLService/` (Rust, async-graphql)
- **GraphQLクライアント**: `src/lib/graphql/` (TypeScript, Apollo Client)
- **型生成**: GraphQL Code GeneratorがRustサーバーのスキーマからTypeScript型を自動生成

TypeScript側はクライアント実装のみで、サーバー実装はありません。

## Benefits

1. **Type Safety**: TypeScript interfaces maintained
2. **Performance**: Efficient relational queries
3. **Scalability**: PostgreSQL scalability
4. **Consistency**: Unified data access across the application
5. **Simplicity**: Direct Supabase client usage (no ORM overhead)

## Usage

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

### Timeline 3D Force モード（完全グラフ）

- パス: `participants/[id]/timeline`
- 表示モードトグルに「3D Force」を追加
- 実装: `src/components/Force3DWordGraph.tsx`
- ノード: 単語ごとに集約し、`scale = normalize(avgReactionValue * log(1+count))`
- エッジ: 完全グラフ（全組合せ）、`weight = normalize(raw_i * raw_j)`
- レンダリング: `@react-three/fiber` + `three`。カメラ・回転は `OrbitControls`

参考モデル（Spirit in Physics 理論）: [投稿ページ](https://www.junkawasaki.com/posts/spirit-in-physics)

## API Endpoints

- `GET /api/participants` - List all participants
- `GET /api/participants/[id]` - Get participant details
- `GET /api/participants/[id]/results` - Get analysis results
- `GET /api/dashboard-stats` - Get dashboard statistics
