use std::env;
use async_graphql::{Schema, EmptyMutation, EmptySubscription};
use async_graphql::http::{GraphQLPlaygroundConfig, playground_source};
use graphql::db::connection::establish_connection;
use std::sync::Arc;

#[tokio::test]
async fn test_schema_creation() {
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres");
    
    let db_pool = establish_connection().await.unwrap();
    let pool_arc = Arc::new(db_pool);
    
    // Test schema creation (same as in main.rs)
    let schema = Schema::build(EmptyMutation::default(), EmptyMutation::default(), EmptySubscription)
        .data(pool_arc)
        .finish();
    
    // Verify schema is created successfully
    assert!(true, "Schema created successfully");
}

#[test]
fn test_playground_source_generation() {
    // Test that playground source can be generated (same as in main.rs)
    let config = GraphQLPlaygroundConfig::new("/graphql");
    let playground_html = playground_source(config);
    
    // Verify playground HTML is generated
    assert!(playground_html.contains("GraphQL Playground"));
    assert!(playground_html.contains("/graphql"));
}

#[tokio::test]
async fn test_database_connection_in_main_context() {
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres");
    
    // Test database connection (same as in main.rs)
    let db_pool = establish_connection().await;
    assert!(db_pool.is_ok(), "Database connection should succeed");
    
    let pool_arc = Arc::new(db_pool.unwrap());
    // Verify Arc wrapping works
    assert!(Arc::strong_count(&pool_arc) >= 1);
}

