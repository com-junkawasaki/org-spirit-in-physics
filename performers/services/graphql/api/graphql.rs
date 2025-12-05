// Merkle DAG: graphql.service.api.graphql
// Vercel Serverless Function entry point for GraphQL API
// This file is the entry point for /api/graphql route

// Import from the library crate
use graphql_service::{PostgresPool, create_schema, get_allowed_origins};
use graphql_service::auth::verify_supabase_token;
use graphql_service::schema::{Schema, Context};

use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};
use juniper::http::GraphQLRequest;
use serde_json::json;
use tracing::info;
use std::sync::{Arc, OnceLock};

// Global schema instance (initialized once per Serverless Function instance)
static SCHEMA: OnceLock<Arc<Schema>> = OnceLock::new();
static POOL: OnceLock<sqlx::Pool<sqlx::Postgres>> = OnceLock::new();

async fn get_or_initialize_schema() -> Result<(), Error> {
    if SCHEMA.get().is_some() {
        return Ok(());
    }

    let database_url = std::env::var("DATABASE_URL")
        .map_err(|_| Error::from("DATABASE_URL environment variable is required"))?;
    
    let pool_wrapper = PostgresPool::new(&database_url).await
        .map_err(|e| Error::from(format!("Failed to connect to database: {}", e)))?;
    info!("PostgreSQL connection pool initialized");
    
    let pool = pool_wrapper.pool().clone();
    POOL.set(pool.clone()).map_err(|_| Error::from("Failed to set pool"))?;
    
    let schema = Arc::new(create_schema(pool));
    SCHEMA.set(schema).map_err(|_| Error::from("Failed to set schema"))?;
    
    Ok(())
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
    get_or_initialize_schema().await?;
    
    let schema = SCHEMA.get().ok_or_else(|| Error::from("Schema not initialized"))?;
    let pool = POOL.get().ok_or_else(|| Error::from("Pool not initialized"))?;

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
            let graphql_request: GraphQLRequest = serde_json::from_str(&body_str)
                .unwrap_or_else(|_| GraphQLRequest::new("query { __typename }"));

            // Extract and verify JWT token from Authorization header
            let auth_header = req.headers().get("authorization").and_then(|v| v.to_str().ok());
            let supabase_url = std::env::var("SUPABASE_URL").ok();
            
            // Create context with auth
            let auth_context = verify_supabase_token(auth_header, supabase_url).await.ok();
            let context = Context {
                pool: pool.clone(),
                auth: auth_context,
            };

            // Execute GraphQL query
            let response = graphql_request.execute(schema, &context).await;

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
            let sdl = schema.as_schema_language();

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
