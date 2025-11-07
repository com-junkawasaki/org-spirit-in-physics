use diesel::r2d2::{ConnectionManager, Pool, PooledConnection};
use diesel::pg::PgConnection;
use diesel::RunQueryDsl;
use std::env;

pub mod schema;

pub type DbPool = Pool<ConnectionManager<PgConnection>>;
pub type DbConnection = PooledConnection<ConnectionManager<PgConnection>>;

pub fn establish_connection() -> anyhow::Result<DbPool> {
    let database_url = env::var("DATABASE_URL")
        .map_err(|_| anyhow::anyhow!("DATABASE_URL must be set"))?;

    // Log the database URL (without password) for debugging
    let url_for_log = database_url.split('@').nth(1).unwrap_or("unknown");
    tracing::info!("Connecting to database: ...@{}", url_for_log);

    let manager = ConnectionManager::<PgConnection>::new(database_url.clone());
    let pool = Pool::builder()
        .build(manager)
        .map_err(|e| anyhow::anyhow!("Failed to create connection pool: {} (DATABASE_URL: ...@{})", e, url_for_log))?;

    // Test connection by executing a simple query
    let mut test_conn = pool.get()
        .map_err(|e| anyhow::anyhow!("Failed to get test connection: {}", e))?;
    diesel::sql_query("SELECT current_database(), current_schema()")
        .execute(&mut *test_conn)
        .map_err(|e| anyhow::anyhow!("Failed to test database connection: {} (DATABASE_URL: ...@{})", e, url_for_log))?;

    Ok(pool)
}

pub fn get_connection(pool: &DbPool) -> anyhow::Result<DbConnection> {
    pool.get()
        .map_err(|e| anyhow::anyhow!("Failed to get connection from pool: {}", e))
}

