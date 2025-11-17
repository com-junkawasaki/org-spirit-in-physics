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

        // Parse connection options and handle Supabase pooler
        let url_str = database_url.to_string();
        let mut options: PgConnectOptions;
        
        // For Supabase connection pooler, we need to use direct connection (port 5432)
        // because the pooler doesn't support prepared statements properly
        if url_str.contains("pooler.supabase.com") {
            // Extract project reference ID from connection string
            // Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
            // Direct: postgresql://postgres.[project-ref]:[password]@[project-ref].supabase.co:5432/postgres
            let direct_url = if let Some(at_pos) = url_str.find('@') {
                let (before_at, after_at) = url_str.split_at(at_pos + 1);
                // Extract project-ref from before_at (postgres.[project-ref]:password)
                if let Some(project_ref_start) = before_at.find("postgres.") {
                    let project_ref_part = &before_at[project_ref_start + 9..];
                    if let Some(project_ref_end) = project_ref_part.find(':') {
                        let project_ref = &project_ref_part[..project_ref_end];
                        // Replace host with project-ref.supabase.co:5432
                        let new_after_at = after_at
                            .replace("aws-0-ap-northeast-1.pooler.supabase.com:6543", &format!("{}.supabase.co:5432", project_ref))
                            .replace("pooler.supabase.com:6543", &format!("{}.supabase.co:5432", project_ref));
                        format!("{}{}", before_at, new_after_at)
                    } else {
                        url_str
                    }
                } else {
                    url_str
                }
            } else {
                url_str
            };
            info!("Using direct connection instead of pooler: {}", direct_url.split('@').last().unwrap_or("***"));
            options = direct_url.parse()?;
        } else {
            options = database_url.parse()?;
        }

        // Use PoolOptions to configure connection pool
        // Increase timeout for Supabase direct connection
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

