// Merkle DAG: graphql.service.api.graphql
// Vercel Serverless Function entry point for GraphQL API
// This file is the entry point for /api/graphql route

// Import from the library crate
use graphql_service::{PostgresPool, create_schema, Query, Mutation, get_allowed_origins};
use graphql_service::auth::verify_supabase_token;

use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};
use async_graphql::Schema;
use serde_json::json;
use tracing::info;
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
    // For health and schema endpoints, we don't need the schema initialized
    let schema_mutex_result = get_or_initialize_schema().await;
    
    // Handle routes that don't require schema first
    match path {
        "/api/health" | "/health" => {
            // Health check - doesn't require schema
            let health_response = json!({
                "status": "ok",
                "service": "graphql-service",
                "runtime": "vercel"
            });

            let response = Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", "application/json")
                .body(Body::Text(serde_json::to_string(&health_response)?))?;
            return build_cors_response(response, origin);
        }
        _ => {}
    }
    
    // For other routes, schema is required
    let schema_mutex = schema_mutex_result?;
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

            // Parse GraphQL request from JSON
            let request_json: serde_json::Value = serde_json::from_str(&body_str)
                .unwrap_or_else(|_| json!({ "query": "query { __typename }" }));
            
            let query = request_json.get("query")
                .and_then(|v| v.as_str())
                .unwrap_or("query { __typename }");
            let variables = request_json.get("variables").cloned();
            let operation_name = request_json.get("operationName")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            // Create GraphQL request
            let mut request = async_graphql::Request::new(query);
            if let Some(vars) = variables {
                if let Ok(vars_value) = serde_json::from_value::<async_graphql::Variables>(vars) {
                    request = request.variables(vars_value);
                }
            }
            if let Some(op_name) = operation_name {
                request = request.operation_name(op_name);
            }

            // Extract and verify JWT token from Authorization header
            let auth_header = req.headers().get("authorization").and_then(|v| v.to_str().ok());
            let supabase_url = std::env::var("SUPABASE_URL").ok();
            
            // Verify token and add auth context to request
            if let Ok(auth_context) = verify_supabase_token(auth_header, supabase_url).await {
                request = request.data(auth_context);
            }
            // If token verification fails, continue without auth context
            // Individual resolvers will check for auth if needed

            // Execute GraphQL query
            let response = schema.execute(request).await;

            // Convert response to JSON
            let response_body = serde_json::to_string(&response)
                .map_err(|e| Error::from(format!("Failed to serialize response: {}", e)))?;

            let response = Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", "application/json")
                .body(Body::Text(response_body))?;
            build_cors_response(response, origin)
        }
        "/api/graphql/schema" | "/graphql/schema" => {
            // GraphQL Schema SDL
            let sdl = schema.sdl();

            let response = Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", "text/plain")
                .body(Body::Text(sdl))?;
            build_cors_response(response, origin)
        }
        // Health check is handled above before schema initialization
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
