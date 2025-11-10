// Merkle DAG: import.service.main
// Import service HTTP server entry point

mod config;
mod error;
mod neo4j;
mod types;
mod import;
mod utils;

use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{info, error};

use config::Config;
use neo4j::client::Neo4jClient;
use import::{participants, sessions, emotions};

#[derive(Clone)]
struct AppState {
    neo4j_client: Arc<Mutex<Neo4jClient>>,
    config: Arc<Config>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    info!("Starting import service...");

    // Load configuration
    let config = Arc::new(Config::from_env()?);
    info!("Configuration loaded");

    // Initialize Neo4j client
    let neo4j_client = Neo4jClient::new(&config.neo4j).await?;
    info!("Neo4j client initialized");

    let app_state = AppState {
        neo4j_client: Arc::new(Mutex::new(neo4j_client)),
        config,
    };

    // Build router
    let app = Router::new()
        .route("/import/participants", post(import_participants))
        .route("/import/sessions", post(import_sessions))
        .route("/import/emotions", post(import_emotions))
        .route("/import/status", get(status))
        .with_state(app_state)
        .layer(tower_http::cors::CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8082").await?;
    info!("Import service listening on 0.0.0.0:8082");

    axum::serve(listener, app).await?;

    Ok(())
}

async fn import_participants(
    State(state): State<AppState>,
) -> Result<Json<participants::ImportResult>, (StatusCode, Json<serde_json::Value>)> {
    let mut client = state.neo4j_client.lock().await;
    match participants::import_participants(&mut *client, &state.config).await {
        Ok(result) => Ok(Json(result)),
        Err(e) => {
            error!("Error importing participants: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            ))
        }
    }
}

async fn import_sessions(
    State(state): State<AppState>,
) -> Result<Json<sessions::ImportResult>, (StatusCode, Json<serde_json::Value>)> {
    let mut client = state.neo4j_client.lock().await;
    match sessions::import_sessions(&mut *client, &state.config).await {
        Ok(result) => Ok(Json(result)),
        Err(e) => {
            error!("Error importing sessions: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            ))
        }
    }
}

async fn import_emotions(
    State(state): State<AppState>,
) -> Result<Json<emotions::ImportResult>, (StatusCode, Json<serde_json::Value>)> {
    let mut client = state.neo4j_client.lock().await;
    match emotions::import_emotions(&mut *client, &state.config).await {
        Ok(result) => Ok(Json(result)),
        Err(e) => {
            error!("Error importing emotions: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            ))
        }
    }
}

async fn status() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "service": "import-service"
    }))
}

