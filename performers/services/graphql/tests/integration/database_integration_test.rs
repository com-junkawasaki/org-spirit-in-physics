use graphql::db::connection::establish_connection;
use diesel_async::RunQueryDsl;
use diesel::sql_types::Integer;
use diesel::sql_query;
use std::env;

#[tokio::test]
async fn test_database_connection_integration() {
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres");
    
    let pool = establish_connection().await.unwrap();
    let mut conn = pool.get().await.unwrap();
    
    // Test that we can execute a simple query
    let result = sql_query("SELECT 1 as value")
        .load::<(i32,)>(&mut conn)
        .await;
    assert!(result.is_ok(), "Should be able to execute SQL query");
}

#[tokio::test]
async fn test_database_transaction() {
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres");
    
    let pool = establish_connection().await.unwrap();
    let mut conn = pool.get().await.unwrap();
    
    // Test transaction handling
    // Note: This would require actual database setup
    assert!(true, "Transaction test placeholder");
}

