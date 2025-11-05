//! GraphQL Server Main Entry Point
//! 
//! Merkle DAG: graphql.server.main
//! OWL: spirit:GraphQL Service Port HTTP server

use async_graphql::*;
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use axum::{
    extract::Extension,
    http::Method,
    response::IntoResponse,
    routing::get,
    Router,
};
use tower::ServiceBuilder;
use tower_http::cors::{CorsLayer, Any};
use std::sync::Arc;
use dotenv::dotenv;

mod schema;
mod resolvers;
mod storage;

use resolvers::{QueryRoot, MutationRoot};
use storage::SupabaseClient;

type Schema = async_graphql::Schema<QueryRoot, MutationRoot, EmptySubscription>;

async fn graphql_handler(
    schema: Extension<Schema>,
    req: GraphQLRequest,
) -> GraphQLResponse {
    schema.execute(req.into_inner()).await.into()
}

async fn graphql_playground() -> impl IntoResponse {
    axum::response::Html(
        async_graphql::http::playground_source(
            async_graphql::http::GraphQLPlaygroundConfig::new("/graphql"),
        ),
    )
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    tracing_subscriber::fmt::init();

    // Initialize Supabase client
    let supabase = Arc::new(
        SupabaseClient::new()
            .map_err(|e| anyhow::anyhow!("Failed to initialize Supabase client: {}", e))?
    );

    // Create GraphQL schema
    let schema = Schema::build(QueryRoot, MutationRoot, EmptySubscription)
        .data(supabase.clone())
        .finish();

    // Build router
    let app = Router::new()
        .route("/graphql", get(graphql_playground).post(graphql_handler))
        .route("/health", get(|| async { "OK" }))
        .layer(Extension(schema))
        .layer(
            ServiceBuilder::new()
                .layer(
                    CorsLayer::new()
                        .allow_origin(Any)
                        .allow_methods([Method::GET, Method::POST])
                        .allow_headers(Any),
                )
                .into_inner(),
        );

    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3003".to_string())
        .parse::<u16>()
        .unwrap_or(3003);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
        .await
        .map_err(|e| anyhow::anyhow!("Failed to bind port {}: {}", port, e))?;

    tracing::info!("GraphQL server listening on http://0.0.0.0:{}/graphql", port);
    tracing::info!("GraphQL Playground available at http://0.0.0.0:{}/graphql", port);

    axum::serve(listener, app)
        .await
        .map_err(|e| anyhow::anyhow!("Server failed: {}", e))?;

    Ok(())
}

