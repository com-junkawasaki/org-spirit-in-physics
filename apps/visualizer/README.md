# Spirit in Physics - Visualizer

## Neo4j Migration Complete

This visualizer has been fully migrated from Supabase to **Neo4j**, a powerful graph database.

## Key Changes

### Client Library (`src/lib/arangodb.ts`)
- **Before**: Supabase JavaScript client
- **After**: Custom Neo4j client with Cypher queries

### API Routes (`src/app/api/`)
- **Before**: Supabase queries in API routes
- **After**: Neo4j client calls with Cypher queries

### Data Functions (`src/lib/data.ts`)
- **Before**: Supabase server client queries
- **After**: Neo4j client integration with graph traversals

## Neo4j Client Features

### Participants Query
```typescript
async getParticipants(): Promise<any[]> {
  const query = `
    MATCH (p:Participant)
    OPTIONAL MATCH (p)-[:HAS_SESSION]->(s:Session)
    OPTIONAL MATCH (p)-[:HAS_SESSION]->(:Session)-[:HAS_RESPONSE]->(r:Response)
    RETURN
      p.id as participant_id,
      count(distinct s) as session_count,
      count(distinct r) as total_responses,
      0.5 as average_spirit_probability,
      p.created_at as last_activity
    ORDER BY p.created_at DESC
  `
  // Returns processed participant data
}
```

### Participant Details Query
```typescript
async getParticipantDetails(participantId: string): Promise<any> {
  const query = `
    MATCH (p:Participant {id: $participantId})
    OPTIONAL MATCH (p)-[:HAS_SESSION]->(s:Session)
    OPTIONAL MATCH (s)-[:HAS_RESPONSE]->(r:Response)
    RETURN p, s, r
    ORDER BY s.created_at, r.event_ts
  `
}
```

## Configuration

Add to your environment variables:
```bash
NEO4J_URI=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4jpassword
NEO4J_DATABASE=neo4j
```

## Migration Benefits

1. **Type Safety**: TypeScript interfaces maintained
2. **Performance**: Direct graph queries for complex relationships
3. **Scalability**: Efficient handling of connected data
4. **Consistency**: Unified data access across the application

## Usage

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

## API Endpoints

- `GET /api/participants` - List all participants
- `GET /api/participants/[id]` - Get participant details
- `GET /api/participants/[id]/results` - Get analysis results
- `GET /api/dashboard-stats` - Get dashboard statistics
