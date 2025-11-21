// Merkle DAG: import.service.database.postgres
// PostgreSQL client using SQLx

use sqlx::{PgPool, Pool, Postgres};
use tracing::{error, info};

use crate::error::ImportError;

pub struct PostgresClient {
    pool: PgPool,
}

impl PostgresClient {
    pub async fn new(database_url: &str) -> Result<Self, ImportError> {
        info!("Connecting to PostgreSQL: {}", database_url.split('@').last().unwrap_or("***"));

        let pool = PgPool::connect(database_url)
            .await
            .map_err(|e| ImportError::Database(format!("Failed to connect to PostgreSQL: {}", e)))?;

        // Test connection
        sqlx::query("SELECT 1")
            .execute(&pool)
            .await
            .map_err(|e| ImportError::Database(format!("Failed to test PostgreSQL connection: {}", e)))?;

        info!("PostgreSQL connection established");

        Ok(PostgresClient { pool })
    }

    pub fn pool(&self) -> &Pool<Postgres> {
        &self.pool
    }
}

