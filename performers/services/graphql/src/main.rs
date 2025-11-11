// Merkle DAG: graphql.service.main
// GraphQL service entry point using async-graphql + Axum

mod schema;
mod types;
mod resolvers;
mod database;

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Router, Json,
};
use async_graphql::{
    http::{playground_source, GraphQLPlaygroundConfig},
    Request, Response as GraphQLResponse,
};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse as AxumGraphQLResponse};
use std::sync::Arc;
use tracing::{info, error};

use database::PostgresPool;
use schema::create_schema;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    info!("Starting GraphQL service...");

    // Load database URL from environment
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/spirit_in_physics".to_string());

    // Initialize database pool
    let pool = PostgresPool::new(&database_url).await?;
    info!("PostgreSQL connection pool initialized");

    // Create GraphQL schema
    let schema = create_schema(pool.pool().clone()).await?;

    // Build router
    let app = Router::new()
        .route("/graphql", post(graphql_handler))
        .route("/graphql/playground", get(graphql_playground))
        .route("/health", get(health_check))
        .with_state(schema);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8081").await?;
    info!("GraphQL service listening on 0.0.0.0:8081");
    info!("GraphQL Playground available at http://localhost:8081/graphql/playground");

    axum::serve(listener, app).await?;

    Ok(())
}

async fn graphql_handler(
    State(schema): State<async_graphql::Schema<schema::Query, schema::Mutation, async_graphql::EmptySubscription>>,
    req: GraphQLRequest,
) -> AxumGraphQLResponse {
    schema.execute(req.into_inner()).await.into()
}

async fn graphql_playground() -> impl IntoResponse {
    Response::builder()
        .status(StatusCode::OK)
        .header("content-type", "text/html; charset=utf-8")
        .body(playground_source(GraphQLPlaygroundConfig::new("/graphql")))
        .unwrap()
}

async fn health_check() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "service": "graphql-service"
    }))
}

