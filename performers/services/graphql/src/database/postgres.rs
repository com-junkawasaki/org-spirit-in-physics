// Merkle DAG: graphql.service.database.postgres
// PostgreSQL connection pool using SQLx

use sqlx::{PgPool, Pool, Postgres, postgres::{PgPoolOptions, PgConnectOptions}};
use tracing::{error, info};

pub struct PostgresPool {
    pool: PgPool,
}

impl PostgresPool {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        info!("Connecting to PostgreSQL: {}", database_url.split('@').last().unwrap_or("***"));

        // Parse connection options
        // For Supabase connection pooler, we use it directly (IPv4 compatible)
        // sqlx 0.8 should handle prepared statements better than 0.7
        let options: PgConnectOptions = database_url.parse()?;

        // Use PoolOptions to configure connection pool
        let pool = match PgPoolOptions::new()
            .max_connections(10)
            .acquire_timeout(std::time::Duration::from_secs(60))
            .connect_with(options)
            .await
        {
            Ok(pool) => pool,
            Err(e) => {
                error!("Failed to connect to PostgreSQL: {}", e);
                let masked_url = database_url.split('@').next().unwrap_or("***");
                error!("Connection URL (masked): {}", masked_url);
                return Err(e);
            }
        };

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
