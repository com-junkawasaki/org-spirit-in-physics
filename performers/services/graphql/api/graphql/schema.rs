// Merkle DAG: graphql.service.api.graphql.schema
// Vercel Serverless Function entry point for GraphQL schema endpoint
// This file is the entry point for /api/graphql/schema route

use graphql_service::{PostgresPool, create_schema, get_allowed_origins};

use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};
use std::sync::{Arc, OnceLock};
use graphql_service::schema::Schema;

// Global schema instance (initialized once per Serverless Function instance)
static SCHEMA: OnceLock<Arc<Schema>> = OnceLock::new();

async fn get_or_initialize_schema() -> Result<(), Error> {
    if SCHEMA.get().is_some() {
        return Ok(());
    }

    let database_url = std::env::var("DATABASE_URL")
        .map_err(|_| Error::from("DATABASE_URL environment variable is required"))?;
    
    let pool = PostgresPool::new(&database_url).await
        .map_err(|e| Error::from(format!("Failed to connect to database: {}", e)))?;
    tracing::info!("PostgreSQL connection pool initialized");
    
    let schema = Arc::new(create_schema(pool.pool().clone()));
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
        "GET, OPTIONS".parse().map_err(|e| Error::from(format!("Invalid header: {}", e)))?
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

    // Return GraphQL Schema SDL
    let sdl = schema.as_schema_language();

    let response = Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "text/plain")
        .body(Body::Text(sdl))?;
    build_cors_response(response, origin)
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    tracing::info!("Starting GraphQL schema endpoint on Vercel...");
    run(handler).await
}
