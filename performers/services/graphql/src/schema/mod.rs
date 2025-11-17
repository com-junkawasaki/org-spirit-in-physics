// Merkle DAG: graphql.service.schema
// GraphQL schema definition

pub mod query;
pub mod mutation;
pub mod subscription;

use async_graphql::Schema;
use sqlx::{PgPool, Pool, Postgres};
use crate::physics::SimulationManager;

pub use query::Query;
pub use mutation::Mutation;
pub use subscription::Subscription;

pub async fn create_schema(pool: Pool<Postgres>) -> Result<Schema<Query, Mutation, Subscription>, Box<dyn std::error::Error>> {
    let simulation_manager = SimulationManager::new();
    
    let schema = Schema::build(Query::default(), Mutation::default(), Subscription::default())
        .data(pool)
        .data(simulation_manager)
        .finish();
    
    Ok(schema)
}

