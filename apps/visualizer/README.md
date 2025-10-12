# Spirit in Physics - Visualizer

## ArangoDB Migration Complete

This visualizer has been fully migrated from Supabase to **ArangoDB**, a powerful multi-model database.

## Key Changes

### Client Library (`src/lib/supabase.ts`)
- **Before**: Supabase JavaScript client
- **After**: Custom TerminusDB client with WOQL queries

### API Routes (`src/app/api/`)
- **Before**: Supabase queries in API routes
- **After**: TerminusDB client calls

### Data Functions (`src/lib/data.ts`)
- **Before**: Supabase server client queries
- **After**: TerminusDB client integration

## TerminusDB Client Features

### Participants Query
```typescript
async getParticipants(): Promise<any[]> {
  const query = `
    * triple("v:Participant", "rdf:type", "scm:Participant").
    * triple("v:Participant", "scm:id", "v:Id").
    * triple("v:Participant", "has_response", "v:Response").opt().
    * group_by("v:Participant", ["v:Participant"], "v:ResponseCount", count("v:Response", "v:ResponseCount")).
  `
  // Returns processed participant data
}
```

### Participant Details Query
```typescript
async getParticipantDetails(participantId: string): Promise<any> {
  const query = `
    * triple("terminusdb:///data/Participant/${participantId}", "rdf:type", "scm:Participant").
    * triple("terminusdb:///data/Participant/${participantId}", "scm:id", "v:Id").
    * triple("terminusdb:///data/Participant/${participantId}", "scm:age", "v:Age").opt().
    // ... more triples
  `
}
```

## Configuration

Add to your environment variables:
```bash
NEXT_PUBLIC_TERMINUSDB_URL=http://localhost:6363
TERMINUSDB_USER=admin
TERMINUSDB_PASSWORD=root
TERMINUSDB_DATABASE_ID=spirit_in_physics
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
