// Merkle DAG: graphql.service.main
// GraphQL service entry point using Juniper + Poem
// Supports both Vercel Serverless Functions and standalone HTTP server

mod schema;
mod types;
mod resolvers;
mod database;
mod storage;
mod auth;

use tracing;
use database::PostgresPool;
use schema::{create_schema, Schema, Context};
use crate::auth::{verify_supabase_token, AuthContext};

#[cfg(not(feature = "vercel"))]
use poem::{
    handler,
    http::Method,
    listener::TcpListener,
    middleware::Cors,
    web::{Data, Html, Json},
    EndpointExt, Route, Server, Request,
};
#[cfg(not(feature = "vercel"))]
use juniper::http::GraphQLRequest;
#[cfg(not(feature = "vercel"))]
use tracing::{warn, error};
use std::sync::Arc;

#[cfg(feature = "vercel")]
mod vercel_handler;

// Get allowed origins from environment or use defaults
pub fn get_allowed_origins() -> Vec<String> {
    let mut origins = vec![
        "http://localhost:25250".to_string(),      // participant app
        "https://participant.spirit-in-physics.orb.local".to_string(), // participant app via orb.local
        "http://localhost:3000".to_string(),      // researcher app (legacy)
        "http://localhost:25260".to_string(),     // researcher app (current)
        "https://researcher.spirit-in-physics.orb.local".to_string(), // researcher app via orb.local
        "http://localhost:4321".to_string(),      // paper app
        "http://localhost:4322".to_string(),      // demo app
        "https://demo.spirit-in-physics.orb.local".to_string(), // demo app via orb.local
        "http://localhost:8080".to_string(),      // fallback
        "http://127.0.0.1:25250".to_string(),
        "http://127.0.0.1:3000".to_string(),
        "http://127.0.0.1:25260".to_string(),
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

    tracing::info!("Starting GraphQL service on Vercel...");
    vercel_handler::run().await
}

// GraphQL handler with authentication middleware
#[cfg(not(feature = "vercel"))]
#[handler]
async fn graphql_handler(
    req: &Request,
    body: Result<Json<serde_json::Value>, poem::Error>,
    Data(schema): Data<&Arc<Schema>>,
    Data(pool): Data<&sqlx::Pool<sqlx::Postgres>>,
) -> poem::Result<Json<serde_json::Value>> {
    tracing::info!("GraphQL request received from: {}", req.remote_addr());
    
    // Handle JSON parsing error gracefully
    let body_json = match body {
        Ok(json) => json.0,
        Err(e) => {
            error!("Failed to parse JSON body: {}", e);
            return Ok(Json(serde_json::json!({
                "errors": [{"message": format!("Invalid JSON: {}", e)}]
            })));
        }
    };
    
    // Log request for debugging
    if let Some(query) = body_json.get("query").and_then(|v| v.as_str()) {
        let query_preview: String = query.chars().take(100).collect();
        tracing::info!("GraphQL query: {}", query_preview);
    } else {
        warn!("GraphQL request missing query field");
    }
    
    // Parse GraphQL request
    let graphql_request: GraphQLRequest = match serde_json::from_value(body_json.clone()) {
        Ok(req) => req,
        Err(e) => {
            warn!("Failed to parse GraphQL request: {}", e);
            return Ok(Json(serde_json::json!({
                "errors": [{"message": format!("Invalid GraphQL request: {}", e)}]
            })));
        }
    };
    
    // Extract and verify JWT token from Authorization header
    let auth_header = req.headers().get("authorization").and_then(|v| v.to_str().ok());
    let supabase_url = std::env::var("SUPABASE_URL").ok();
    
    // Create context with auth
    let auth_context = verify_supabase_token(auth_header, supabase_url).await.ok();
    let context = Context {
        pool: pool.clone(),
        auth: auth_context,
    };
    
    // Execute GraphQL request
    tracing::info!("Executing GraphQL request");
    let response = graphql_request.execute(schema, &context).await;
    
    tracing::info!("GraphQL request completed successfully");
    Ok(Json(serde_json::to_value(response).unwrap_or_else(|e| {
        error!("Failed to serialize GraphQL response: {}", e);
        serde_json::json!({
            "errors": [{"message": "Failed to serialize response"}]
        })
    })))
}

#[cfg(not(feature = "vercel"))]
#[handler]
async fn graphql_playground() -> Html<String> {
    let html = r#"
<!DOCTYPE html>
<html>
<head>
    <title>GraphQL Playground</title>
    <link rel="stylesheet" href="https://unpkg.com/graphql-playground-react/build/static/css/index.css" />
    <link rel="shortcut icon" href="https://unpkg.com/graphql-playground-react/build/favicon.png" />
    <script src="https://unpkg.com/graphql-playground-react/build/static/js/middleware.js"></script>
</head>
<body>
    <div id="root">
        <style>
            body {
                margin: 0;
                overflow: hidden;
            }
            #root {
                width: 100vw;
                height: 100vh;
            }
        </style>
    </div>
    <script>
        window.addEventListener('load', function (event) {
            GraphQLPlayground.init(document.getElementById('root'), {
                endpoint: '/graphql'
            })
        })
    </script>
</body>
</html>
    "#;
    Html(html.to_string())
}

#[cfg(not(feature = "vercel"))]
#[handler]
async fn schema_handler(
    Data(schema): Data<&Arc<Schema>>,
) -> String {
    schema.as_schema_language()
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

    tracing::info!("Starting GraphQL service...");

    // Load database URL from environment
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/spirit_in_physics".to_string());

    // Initialize database pool
    let pool = PostgresPool::new(&database_url).await?;
    tracing::info!("PostgreSQL connection pool initialized");

    // Create GraphQL schema
    let schema = Arc::new(create_schema(pool.pool().clone()));

    // Configure CORS
    let allowed_origins = get_allowed_origins();
    
    let cors = Cors::new()
        .allow_origins(allowed_origins)
        .allow_methods(vec![Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(vec!["Content-Type", "Authorization"])
        .allow_credentials(true);

    // Build routes with comprehensive error handling
    let app = Route::new()
        .at("/graphql", graphql_handler)
        .at("/graphql/playground", graphql_playground)
        .at("/graphql/schema", schema_handler)
        .at("/health", health_check)
        .data(schema)
        .data(pool.pool().clone())
        .with(cors);

    // Get port from environment or use default
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "8081".to_string())
        .parse::<u16>()
        .unwrap_or(8081);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("GraphQL service listening on 0.0.0.0:{}", port);
    tracing::info!("GraphQL Playground available at http://localhost:{}/graphql/playground", port);

    Server::new(TcpListener::bind(addr))
        .run(app)
        .await?;

    Ok(())
}
