// Merkle DAG: graphql.service.api.graphql
// Vercel Serverless Function entry point for GraphQL API
// This file is the entry point for /api/graphql route

// Import from the library crate
use graphql_service::{PostgresPool, create_schema, Query, Mutation, get_allowed_origins};

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
                Body::Text(text) => text.clone(),
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
