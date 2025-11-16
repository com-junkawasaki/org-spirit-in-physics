// Merkle DAG: graphql.service.main
// GraphQL service entry point using async-graphql + Poem
// Supports both Vercel Serverless Functions and standalone HTTP server

mod schema;
mod types;
mod resolvers;
mod database;
mod storage;

use async_graphql::{
    http::{playground_source, GraphQLPlaygroundConfig},
    Schema,
};
use tracing::info;

use database::PostgresPool;
use schema::create_schema;

#[cfg(not(feature = "vercel"))]
use poem::{
    handler,
    http::Method,
    listener::TcpListener,
    middleware::Cors,
    web::{Data, Html, Json},
    EndpointExt, Route, Server,
};
#[cfg(not(feature = "vercel"))]
use async_graphql_poem::GraphQL;

#[cfg(feature = "vercel")]
mod vercel_handler;

// Get allowed origins from environment or use defaults
pub fn get_allowed_origins() -> Vec<String> {
    let mut origins = vec![
        "http://localhost:25250".to_string(),      // participant app
        "https://patient.spirit-in-physics.orb.local".to_string(), // participant app via orb.local
        "http://localhost:3000".to_string(),      // visualizer app
        "http://localhost:4321".to_string(),      // research app
        "http://localhost:4322".to_string(),      // demo app
        "https://demo.spirit-in-physics.orb.local".to_string(), // demo app via orb.local
        "http://localhost:8080".to_string(),      // fallback
        "http://127.0.0.1:25250".to_string(),
        "http://127.0.0.1:3000".to_string(),
        "http://127.0.0.1:4321".to_string(),
        "http://127.0.0.1:4322".to_string(),
    ];

    // Add Vercel deployment URLs from environment
    if let Ok(vercel_url) = std::env::var("VERCEL_URL") {
        origins.push(format!("https://{}", vercel_url));
    }
    if let Ok(vercel_deployment_url) = std::env::var("VERCEL_DEPLOYMENT_URL") {
        origins.push(format!("https://{}", vercel_deployment_url));
    }
    if let Ok(next_public_app_url) = std::env::var("NEXT_PUBLIC_APP_URL") {
        origins.push(next_public_app_url);
    }

    // Add custom origins from environment variable (comma-separated)
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

#[cfg(feature = "vercel")]
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    info!("Starting GraphQL service on Vercel...");
    vercel_handler::run().await
}

#[cfg(not(feature = "vercel"))]
#[handler]
async fn graphql_playground() -> Html<String> {
    Html(playground_source(GraphQLPlaygroundConfig::new("/graphql")))
}

#[cfg(not(feature = "vercel"))]
#[handler]
async fn schema_handler(
    Data(schema): Data<&Schema<schema::Query, schema::Mutation, async_graphql::EmptySubscription>>,
) -> String {
    schema.sdl()
}

#[cfg(not(feature = "vercel"))]
#[handler]
async fn health_check() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "service": "graphql-service"
    }))
}

#[cfg(not(feature = "vercel"))]
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

    // Configure CORS
    // When credentials: 'include' is used, we must specify exact origins (not wildcard)
    let allowed_origins = get_allowed_origins();
    
    let cors = Cors::new()
        .allow_origins(allowed_origins)
        .allow_methods(vec![Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(vec!["Content-Type", "Authorization"])
        .allow_credentials(true);

    // Build routes
    let app = Route::new()
        .at("/graphql", GraphQL::new(schema.clone()))
        .at("/graphql/playground", graphql_playground)
        .at("/graphql/schema", schema_handler)
        .at("/health", health_check)
        .data(schema)
        .with(cors);

    // Get port from environment or use default
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "8081".to_string())
        .parse::<u16>()
        .unwrap_or(8081);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
    info!("GraphQL service listening on 0.0.0.0:{}", port);
    info!("GraphQL Playground available at http://localhost:{}/graphql/playground", port);

    Server::new(TcpListener::bind(addr))
        .run(app)
        .await?;

    Ok(())
}
