use diesel_async::pooled_connection::deadpool::Pool;
use diesel_async::{AsyncPgConnection, pooled_connection::AsyncDieselConnectionManager};
use std::env;

pub type DbPool = Pool<AsyncPgConnection>;

use anyhow::Result;

pub async fn establish_connection() -> Result<DbPool> {
    let database_url = env::var("DATABASE_URL")
        .map_err(|_| anyhow::anyhow!("DATABASE_URL must be set"))?;

    let manager = AsyncDieselConnectionManager::<AsyncPgConnection>::new(database_url);
    let pool = Pool::builder(manager)
        .build()
        .map_err(|e| anyhow::anyhow!("Failed to create connection pool: {}", e))?;

    Ok(pool)
}
