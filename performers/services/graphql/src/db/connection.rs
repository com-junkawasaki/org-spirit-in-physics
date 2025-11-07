use diesel_async::pooled_connection::deadpool::Pool;
use diesel_async::{AsyncPgConnection, pooled_connection::AsyncDieselConnectionManager};
use std::env;

pub type DbPool = Pool<AsyncPgConnection>;

pub async fn establish_connection() -> Result<DbPool, Box<dyn std::error::Error>> {
    let database_url = env::var("DATABASE_URL")
        .map_err(|_| "DATABASE_URL must be set")?;

    let manager = AsyncDieselConnectionManager::<AsyncPgConnection>::new(database_url);
    let pool = Pool::builder(manager)
        .build()
        .map_err(|e| format!("Failed to create connection pool: {}", e))?;

    Ok(pool)
}

