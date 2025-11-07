// Common test utilities and helpers

use diesel_async::pooled_connection::deadpool::Pool;
use diesel_async::{AsyncPgConnection, pooled_connection::AsyncDieselConnectionManager};
use std::env;

/// Create a test database connection pool
pub async fn create_test_pool() -> Result<Pool<AsyncPgConnection>, Box<dyn std::error::Error>> {
    let database_url = env::var("TEST_DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:54322/postgres".to_string());
    
    let manager = AsyncDieselConnectionManager::<AsyncPgConnection>::new(database_url);
    let pool = Pool::builder(manager)
        .max_size(5)
        .build()?;
    
    Ok(pool)
}

/// Setup test database schema
pub async fn setup_test_schema(pool: &Pool<AsyncPgConnection>) -> Result<(), Box<dyn std::error::Error>> {
    // Run migrations if needed
    // This would typically use diesel_migrations
    Ok(())
}

/// Cleanup test data
pub async fn cleanup_test_data(pool: &Pool<AsyncPgConnection>) -> Result<(), Box<dyn std::error::Error>> {
    // Clean up test data after tests
    Ok(())
}

