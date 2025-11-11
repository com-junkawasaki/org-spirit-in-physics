// Merkle DAG: graphql.service.database.postgres
// PostgreSQL connection pool using SQLx

use sqlx::{PgPool, Pool, Postgres};
use tracing::{error, info};

pub struct PostgresPool {
    pool: PgPool,
}

impl PostgresPool {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        info!("Connecting to PostgreSQL: {}", database_url.split('@').last().unwrap_or("***"));

        let pool = PgPool::connect(database_url).await?;

        // Test connection
        sqlx::query("SELECT 1")
            .execute(&pool)
            .await?;

        info!("PostgreSQL connection pool established");

        Ok(PostgresPool { pool })
    }

    pub fn pool(&self) -> &Pool<Postgres> {
        &self.pool
    }
}

impl Clone for PostgresPool {
    fn clone(&self) -> Self {
        PostgresPool {
            pool: self.pool.clone(),
        }
    }
}

