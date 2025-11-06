# Spirit in Physics - Researcher App

## GraphQL/PostgreSQL Migration Complete

This researcher app has been fully migrated from Neo4j to **GraphQL API with PostgreSQL**, providing a more scalable and type-safe data access layer.

## Key Changes

### Client Library (`src/lib/graphql-client.ts`)
- **Before**: Neo4j client with Cypher queries
- **After**: GraphQL client with type-safe queries

### API Routes (`src/app/api/`)
- **Before**: Neo4j Cypher queries in API routes
- **After**: GraphQL API calls via HTTP

### Data Functions (`src/lib/data.ts`)
- **Before**: Neo4j client integration with Cypher queries
- **After**: GraphQL client integration with PostgreSQL backend

## GraphQL Client Features

### Participants Query
```typescript
const query = `
  query GetParticipants {
    participants {
      id
      age
      gender
      handedness
      created_at
      updated_at
    }
  }
`
```

### Participant Details Query
```typescript
const query = `
  query GetParticipant($participantId: String!) {
    participant(participant_id: $participantId)
  }
`
```

## Configuration

Add to your environment variables:
```bash
# GraphQL API URL (default: http://localhost:8080/graphql)
NEXT_PUBLIC_GRAPHQL_RUST_API_URL=http://localhost:8080/graphql
GRAPHQL_RUST_API_URL=http://localhost:8080/graphql
```

## Migration Benefits

1. **Type Safety**: GraphQL schema provides compile-time type safety
2. **Performance**: PostgreSQL with optimized indexes for fast queries
3. **Scalability**: Horizontal scaling with PostgreSQL replication
4. **Consistency**: Unified GraphQL API across all applications
5. **Developer Experience**: GraphQL Playground for interactive query testing

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
