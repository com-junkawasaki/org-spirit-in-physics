//! GraphQL Server Main Entry Point
//! 
//! Merkle DAG: graphql.server.main
//! OWL: spirit:GraphQL Service Port HTTP server

use async_graphql::*;
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use axum::{
    extract::Extension,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use std::net::SocketAddr;
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

    // Build router with schema extension
    // Note: CORS will be handled at the reverse proxy level in production
    let app = Router::new()
        .route("/graphql", post(graphql_handler).get(graphql_playground))
        .route("/health", get(|| async { "OK" }))
        .layer(Extension(schema));

    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3003".to_string())
        .parse::<u16>()
        .unwrap_or(3003);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    
    tracing::info!("GraphQL server listening on http://{}/graphql", addr);
    tracing::info!("GraphQL Playground available at http://{}/graphql", addr);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .map_err(|e| anyhow::anyhow!("Server failed: {}", e))?;

    Ok(())
}

