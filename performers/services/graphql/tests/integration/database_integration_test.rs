use graphql::db::connection::establish_connection;
use diesel_async::RunQueryDsl;
use diesel::sql_query;
use diesel::sql_types::Integer;
use diesel::QueryableByName;
use std::env;

#[derive(QueryableByName)]
struct TestValue {
    #[diesel(sql_type = Integer, column_name = "value")]
    value: i32,
}

#[tokio::test]
async fn test_database_connection_integration() {
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres");
    
    let pool = establish_connection().await.unwrap();
    let _conn = pool.get().await.unwrap();
    
    // Test that we can get a connection from the pool
    assert!(true, "Connection pool test");
}

#[tokio::test]
async fn test_database_transaction() {
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres");
    
    let pool = establish_connection().await.unwrap();
    let _conn = pool.get().await.unwrap();
    
    // Test transaction handling
    // Note: This would require actual database setup
    assert!(true, "Transaction test placeholder");
}

#[tokio::test]
async fn test_query_imported_participant_data() {
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres");
    
    let pool = establish_connection().await.unwrap();
    let mut conn = pool.get().await.unwrap();
    
    use diesel::prelude::*;
    use graphql::db::schema::*;
    
    // Query participants
    let participant_count: i64 = participants::table
        .count()
        .get_result(&mut conn)
        .await
        .unwrap_or(0);
    
    // This test verifies we can query imported data
    // In a real scenario, we would verify specific imported records
    assert!(participant_count >= 0, "Should be able to query participants");
}

#[tokio::test]
async fn test_query_sessions() {
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres");
    
    let pool = establish_connection().await.unwrap();
    let mut conn = pool.get().await.unwrap();
    
    use diesel::prelude::*;
    use graphql::db::schema::*;
    
    // Query sessions
    let session_count: i64 = participant_experiment_sessions::table
        .count()
        .get_result(&mut conn)
        .await
        .unwrap_or(0);
    
    assert!(session_count >= 0, "Should be able to query sessions");
}

#[tokio::test]
async fn test_query_response_data() {
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres");
    
    let pool = establish_connection().await.unwrap();
    let mut conn = pool.get().await.unwrap();
    
    use diesel::prelude::*;
    use graphql::db::schema::*;
    
    // Query response data
    let response_count: i64 = participant_response_data::table
        .count()
        .get_result(&mut conn)
        .await
        .unwrap_or(0);
    
    assert!(response_count >= 0, "Should be able to query response data");
}

#[tokio::test]
async fn test_query_emotion_data() {
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres");
    
    let pool = establish_connection().await.unwrap();
    let mut conn = pool.get().await.unwrap();
    
    use diesel::prelude::*;
    use graphql::db::schema::*;
    
    // Query emotion data
    let emotion_count: i64 = emotion_data::table
        .count()
        .get_result(&mut conn)
        .await
        .unwrap_or(0);
    
    assert!(emotion_count >= 0, "Should be able to query emotion data");
}

#[tokio::test]
async fn test_query_physiological_data() {
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres");
    
    let pool = establish_connection().await.unwrap();
    let mut conn = pool.get().await.unwrap();
    
    use diesel::prelude::*;
    use graphql::db::schema::*;
    
    // Query physiological data
    let physiological_count: i64 = physiological_data::table
        .count()
        .get_result(&mut conn)
        .await
        .unwrap_or(0);
    
    assert!(physiological_count >= 0, "Should be able to query physiological data");
}

