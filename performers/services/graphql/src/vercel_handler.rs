// Merkle DAG: graphql.service.vercel_handler
// Vercel Serverless Functions handler for GraphQL API

use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};
use async_graphql::{
    http::{GraphQLRequest, GraphQLResponse},
    Schema,
};
use serde_json::json;
use tracing::{error, info};

use crate::database::PostgresPool;
use crate::schema::{create_schema, Query, Mutation};
use crate::get_allowed_origins;

// Global schema instance (initialized once)
static SCHEMA: tokio::sync::OnceCell<Schema<Query, Mutation, async_graphql::EmptySubscription>> = tokio::sync::OnceCell::const_new();

async fn initialize_schema() -> Result<(), Box<dyn std::error::Error>> {
    let database_url = std::env::var("DATABASE_URL")
        .map_err(|_| "DATABASE_URL environment variable is required")?;

    let pool = PostgresPool::new(&database_url).await?;
    info!("PostgreSQL connection pool initialized");

    let schema = create_schema(pool.pool().clone()).await?;
    SCHEMA.set(schema).map_err(|_| "Failed to set schema")?;

    Ok(())
}

fn get_schema() -> &'static Schema<Query, Mutation, async_graphql::EmptySubscription> {
    SCHEMA.get().expect("Schema not initialized")
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
    if SCHEMA.get().is_none() {
        initialize_schema().await.map_err(|e| {
            error!("Failed to initialize schema: {}", e);
            Error::from(format!("Failed to initialize schema: {}", e))
        })?;
    }

    let schema = get_schema();

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
        "/api/graphql/playground" | "/graphql/playground" => {
            // GraphQL Playground
            let playground_html = async_graphql::http::playground_source(
                async_graphql::http::GraphQLPlaygroundConfig::new("/api/graphql")
            );

            let response = Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", "text/html")
                .body(Body::Text(playground_html))?;
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
        "/api/health" | "/health" => {
            // Health check
            let health_response = json!({
                "status": "ok",
                "service": "graphql-service",
                "runtime": "vercel"
            });

            let response = Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", "application/json")
                .body(Body::Text(serde_json::to_string(&health_response)?))?;
            build_cors_response(response, origin)
        }
        _ => {
            Ok(Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body(Body::Text("Not Found".to_string()))?)
        }
    }
}

pub async fn run() -> Result<(), Error> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    info!("Starting GraphQL service on Vercel...");
    run(handler).await
}

