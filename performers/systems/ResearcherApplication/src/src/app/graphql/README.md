# GraphQL Service Port

GraphQL API implementation for Spirit in Physics system.

## Endpoint

- **Path**: `/graphql`
- **Methods**: `GET` (introspection), `POST` (queries/mutations)

## Usage

### Query Example

```graphql
query {
  participants {
    id
    age
    gender
    createdAt
  }
}
```

### Mutation Example

```graphql
mutation {
  executeActivity(
    activityId: "https://spirit-in-physics.gftd.ai/activity/AnalysisProcess"
    inputs: [
      {
        id: "word-response-1"
        type: "https://spirit-in-physics.gftd.ai/ontology#WordResponse"
        data: {
          stimulusWord: "水"
          responseWord: "海"
          reactionTimeMs: 1200
        }
      }
    ]
  ) {
    success
    result {
      activityId
      success
      outputs {
        id
        type
        data
      }
    }
    error
  }
}
```

## Integration with Rust Activities

The GraphQL API integrates with the Rust activities server via HTTP:

- **Rust Server URL**: `http://localhost:3001` (configurable via `RUST_ACTIVITIES_URL` env var)
- **Endpoint**: `POST /execute`

## Schema

See `schema-simple.ts` for the complete GraphQL schema definition.

## Types

- `Participant`: Participant data
- `Session`: Experiment session data
- `AnalysisResult`: Analysis results from Kawasaki Model
- `ActivityExecutionResponse`: Response from Rust activities server

