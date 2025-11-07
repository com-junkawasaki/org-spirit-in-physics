use graphql::db::connection::establish_connection;
use std::env;

#[tokio::test]
async fn test_establish_connection_success() {
    // Set test database URL
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres");
    
    let result = establish_connection().await;
    assert!(result.is_ok(), "Connection should be established successfully");
    
    let pool = result.unwrap();
    let conn = pool.get().await;
    assert!(conn.is_ok(), "Should be able to get connection from pool");
}

#[tokio::test]
async fn test_establish_connection_missing_env() {
    // Remove DATABASE_URL
    env::remove_var("DATABASE_URL");
    
    let result = establish_connection().await;
    assert!(result.is_err(), "Should fail when DATABASE_URL is not set");
}

#[tokio::test]
async fn test_establish_connection_invalid_url() {
    env::set_var("DATABASE_URL", "invalid://url");
    
    // Note: deadpool creates the pool lazily, so we need to actually try to get a connection
    let result = establish_connection().await;
    if let Ok(pool) = result {
        // Try to get a connection to trigger the actual error
        let conn_result = pool.get().await;
        assert!(conn_result.is_err(), "Should fail with invalid database URL");
    } else {
        // Pool creation itself failed, which is also acceptable
        assert!(true, "Pool creation failed as expected");
    }
}

#[tokio::test]
async fn test_connection_pool_reuse() {
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres");
    
    let pool = establish_connection().await.unwrap();
    
    // Get multiple connections from the same pool
    let conn1 = pool.get().await;
    let conn2 = pool.get().await;
    
    assert!(conn1.is_ok(), "First connection should succeed");
    assert!(conn2.is_ok(), "Second connection should succeed");
}
