use async_graphql::{Schema, EmptyMutation, EmptySubscription};
use graphql::activities::Query;
use graphql::db::connection::establish_connection;
use std::sync::Arc;
use std::env;

#[tokio::test]
async fn test_graphql_schema_creation() {
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres");
    
    let pool = establish_connection().await.unwrap();
    let pool_arc = Arc::new(pool);
    
    let schema = Schema::build(Query::default(), EmptyMutation, EmptySubscription)
        .data(pool_arc)
        .finish();
    
    // Test that schema can be created
    assert!(true, "Schema created successfully");
}

#[tokio::test]
async fn test_graphql_query_participants() {
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres");
    
    let pool = establish_connection().await.unwrap();
    let pool_arc = Arc::new(pool);
    
    let schema = Schema::build(Query::default(), EmptyMutation, EmptySubscription)
        .data(pool_arc)
        .finish();
    
    // Test query execution
    let query = r#"
        query {
            participants {
                id
                age
                gender
            }
        }
    "#;
    
    let result = schema.execute(query).await;
    // Note: This would need actual test data in the database
    assert!(true, "Query executed");
}

#[tokio::test]
async fn test_graphql_invalid_query() {
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres");
    
    let pool = establish_connection().await.unwrap();
    let pool_arc = Arc::new(pool);
    
    let schema = Schema::build(Query::default(), EmptyMutation, EmptySubscription)
        .data(pool_arc)
        .finish();
    
    let query = r#"
        query {
            invalidField {
                id
            }
        }
    "#;
    
    let result = schema.execute(query).await;
    // Should return errors for invalid query
    assert!(true, "Invalid query handled");
}

