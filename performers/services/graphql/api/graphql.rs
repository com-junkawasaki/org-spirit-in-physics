// Merkle DAG: graphql.service.api.graphql
// Vercel Serverless Function entry point for GraphQL API
// This file is the entry point for /api/graphql route

// Note: vercel-community/rust treats each api/*.rs file as an independent Serverless Function
// We'll use include! to include the source files directly

// Include all necessary modules from src/
include!("../src/schema/mod.rs");
include!("../src/schema/query.rs");
include!("../src/schema/mutation.rs");
include!("../src/database/mod.rs");
include!("../src/database/postgres.rs");
include!("../src/types/mod.rs");
include!("../src/types/enums.rs");
include!("../src/types/participant.rs");
include!("../src/types/session.rs");
include!("../src/types/stimulus_word.rs");
include!("../src/types/timeline.rs");
include!("../src/types/word_aggregate.rs");
include!("../src/resolvers/mod.rs");
include!("../src/resolvers/mutation.rs");
include!("../src/resolvers/participant.rs");
include!("../src/resolvers/timeline.rs");
include!("../src/storage.rs");

use database::PostgresPool;
use schema::{create_schema, Query, Mutation};

use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};
use async_graphql::{
    http::{GraphQLRequest, GraphQLResponse},
    Schema,
};
use tracing::{error, info};
use std::sync::OnceLock;

// Global schema instance (initialized once per Serverless Function instance)
static SCHEMA: OnceLock<tokio::sync::Mutex<Option<Schema<Query, Mutation, async_graphql::EmptySubscription>>>> = OnceLock::new();

async fn get_or_initialize_schema() -> Result<&'static tokio::sync::Mutex<Option<Schema<Query, Mutation, async_graphql::EmptySubscription>>>, Error> {
    let schema_mutex = SCHEMA.get_or_init(|| tokio::sync::Mutex::new(None));
    
    let mut schema_guard = schema_mutex.lock().await;
    if schema_guard.is_none() {
        let database_url = std::env::var("DATABASE_URL")
            .map_err(|_| Error::from("DATABASE_URL environment variable is required"))?;
        
        let pool = PostgresPool::new(&database_url).await
            .map_err(|e| Error::from(format!("Failed to connect to database: {}", e)))?;
        info!("PostgreSQL connection pool initialized");
        
        let schema = create_schema(pool.pool().clone()).await
            .map_err(|e| Error::from(format!("Failed to create schema: {}", e)))?;
        
        *schema_guard = Some(schema);
    }
    
    Ok(schema_mutex)
}

// Include the get_allowed_origins function from main.rs
fn get_allowed_origins() -> Vec<String> {
    let mut origins = vec![
        "http://localhost:25250".to_string(),
        "https://patient.spirit-in-physics.orb.local".to_string(),
        "http://localhost:3000".to_string(),
        "http://localhost:4321".to_string(),
        "http://localhost:4322".to_string(),
        "https://demo.spirit-in-physics.orb.local".to_string(),
        "http://localhost:8080".to_string(),
        "http://127.0.0.1:25250".to_string(),
        "http://127.0.0.1:3000".to_string(),
        "http://127.0.0.1:4321".to_string(),
        "http://127.0.0.1:4322".to_string(),
    ];

    if let Ok(vercel_url) = std::env::var("VERCEL_URL") {
        origins.push(format!("https://{}", vercel_url));
    }
    if let Ok(vercel_deployment_url) = std::env::var("VERCEL_DEPLOYMENT_URL") {
        origins.push(format!("https://{}", vercel_deployment_url));
    }
    if let Ok(next_public_app_url) = std::env::var("NEXT_PUBLIC_APP_URL") {
        origins.push(next_public_app_url);
    }

    if let Ok(custom_origins) = std::env::var("ALLOWED_ORIGINS") {
        for origin in custom_origins.split(',') {
            let trimmed = origin.trim().to_string();
            if !trimmed.is_empty() {
                origins.push(trimmed);
            }
        }
    }

    origins
}

fn is_allowed_origin(origin: &str) -> bool {
    let allowed_origins = get_allowed_origins();
    allowed_origins.iter().any(|allowed| {
        origin == allowed || origin.starts_with(&format!("{}://", allowed.split("://").next().unwrap_or("")))
    })
}

fn build_cors_response(mut builder: Response<Body>, origin: Option<&str>) -> Result<Response<Body>, Error> {
    builder.headers_mut().insert(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS".parse().map_err(|e| Error::from(format!("Invalid header: {}", e)))?
    );
    builder.headers_mut().insert(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization".parse().map_err(|e| Error::from(format!("Invalid header: {}", e)))?
    );
    builder.headers_mut().insert(
        "Access-Control-Allow-Credentials",
        "true".parse().map_err(|e| Error::from(format!("Invalid header: {}", e)))?
    );

    if let Some(origin) = origin {
        if is_allowed_origin(origin) {
            builder.headers_mut().insert(
                "Access-Control-Allow-Origin",
                origin.parse().map_err(|e| Error::from(format!("Invalid header: {}", e)))?
            );
        }
    }

    Ok(builder)
}

async fn handler(req: Request) -> Result<Response<Body>, Error> {
    let path = req.uri().path();
    let method = req.method();
    let origin = req.headers().get("origin").and_then(|v| v.to_str().ok());

    // Handle CORS preflight
    if method == "OPTIONS" {
        let response = Response::builder()
            .status(StatusCode::NO_CONTENT)
            .body(Body::Empty)?;
        return build_cors_response(response, origin);
    }

    // Initialize schema if not already initialized
    let schema_mutex = get_or_initialize_schema().await?;
    let schema_guard = schema_mutex.lock().await;
    let schema = schema_guard.as_ref().ok_or_else(|| Error::from("Schema not initialized"))?;

    // Route handling
    match path {
        "/api/graphql" | "/graphql" => {
            // Handle GraphQL requests
            let body = req.body();
            let body_str = match body {
                Body::Text(text) => text,
                Body::Binary(bytes) => String::from_utf8_lossy(bytes).to_string(),
                Body::Empty => "{}".to_string(),
            };

            let graphql_request: GraphQLRequest = serde_json::from_str(&body_str)
                .unwrap_or_else(|_| GraphQLRequest::new("query { __typename }"));

            let response = schema.execute(graphql_request.into_inner()).await;
            let graphql_response = GraphQLResponse::from(response);

            let response_body = serde_json::to_string(&graphql_response)
                .map_err(|e| Error::from(format!("Failed to serialize response: {}", e)))?;

            let response = Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", "application/json")
                .body(Body::Text(response_body))?;
            build_cors_response(response, origin)
        }
        _ => {
            Ok(Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body(Body::Text("Not Found".to_string()))?)
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    info!("Starting GraphQL API handler on Vercel...");
    run(handler).await
}

