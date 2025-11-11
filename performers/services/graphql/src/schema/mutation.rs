// Merkle DAG: graphql.service.schema.mutation
// GraphQL Mutation type

use async_graphql::*;

#[derive(Default)]
pub struct Mutation;

#[Object]
impl Mutation {
    /// Create a new participant
    async fn create_participant(&self) -> Result<String> {
        Ok("Not implemented yet".to_string())
    }
}

