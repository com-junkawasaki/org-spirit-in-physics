// Merkle DAG: graphql.service.schema
// GraphQL schema definition

pub mod query;
pub mod mutation;

use async_graphql::{Schema, EmptySubscription};
use sqlx::{PgPool, Pool, Postgres};

use query::Query;
use mutation::Mutation;

pub async fn create_schema(pool: Pool<Postgres>) -> Result<Schema<Query, Mutation, EmptySubscription>, Box<dyn std::error::Error>> {
    let schema = Schema::build(Query, Mutation, EmptySubscription)
        .data(pool)
        .finish();
    
    Ok(schema)
}

