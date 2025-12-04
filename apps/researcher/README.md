# Spirit in Physics - Researcher

## PostgreSQL + GraphQL Migration Complete

This visualizer has been fully migrated to **PostgreSQL + TimescaleDB** with **GraphQL API** (Rust + async-graphql + sqlx).

## Key Changes

### Database
- **Before**: Neo4j graph database (removed)
- **After**: PostgreSQL + TimescaleDB (relational database with time-series extensions)

### API Layer
- **Before**: Neo4j Cypher queries (removed)
- **After**: GraphQL API (Rust service using async-graphql + sqlx)

### Data Access
- **Before**: Direct Neo4j client calls (removed)
- **After**: GraphQL queries and mutations

## GraphQL API Features

The GraphQL service (`performers/services/graphql/`) provides:
- Type-safe queries and mutations
- PostgreSQL connection pooling via sqlx
- TimescaleDB for efficient time-series data storage
- Async/await support for high performance

## Configuration

The GraphQL service connects to PostgreSQL via:
```bash
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/spirit_in_physics
```

## Migration Benefits

1. **Type Safety**: TypeScript interfaces maintained via GraphQL codegen
2. **Performance**: Efficient SQL queries with connection pooling
3. **Scalability**: PostgreSQL + TimescaleDB for time-series data
4. **Consistency**: Unified GraphQL API across the application
5. **Standard SQL**: Easier to maintain and debug than Cypher queries

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
