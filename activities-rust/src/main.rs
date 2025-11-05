//! Activities HTTP Server
//! 
//! Merkle DAG: activities_rust.main
//! OWL: spirit:Process HTTP API
//! 
//! Exposes activities as HTTP API endpoints for Next.js integration

use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::post,
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing_subscriber;

use spirit_activities::{
    activities::*,
    execution::ExecutionEngine,
    models::{ActivityData, ActivityExecutionResult},
};

#[derive(Clone)]
struct AppState {
    _engine: Arc<ExecutionEngine>,
}

#[derive(Deserialize)]
struct ExecuteActivityRequest {
    activity_id: String,
    inputs: Vec<ActivityData>,
}

#[derive(Serialize)]
struct ExecuteActivityResponse {
    success: bool,
    result: Option<ActivityExecutionResult>,
    error: Option<String>,
}

async fn execute_activity(
    State(_state): State<AppState>,
    Json(request): Json<ExecuteActivityRequest>,
) -> Result<Json<ExecuteActivityResponse>, StatusCode> {
    let mut engine = ExecutionEngine::new();
    
    // Register all activities
    engine.register_activity(Box::new(DataCollectionActivity::new()));
    engine.register_activity(Box::new(DataStorageActivity::new(
        std::env::var("SUPABASE_URL").unwrap_or_default(),
        std::env::var("SUPABASE_KEY").unwrap_or_default(),
    )));
    engine.register_activity(Box::new(AnalysisProcessActivity::new()));
    engine.register_activity(Box::new(TimelineIntegrationActivity::new()));
    engine.register_activity(Box::new(VisualizationProcessActivity::new()));

    match engine.execute_activity(&request.activity_id, request.inputs).await {
        Ok(result) => Ok(Json(ExecuteActivityResponse {
            success: true,
            result: Some(result),
            error: None,
        })),
        Err(e) => Ok(Json(ExecuteActivityResponse {
            success: false,
            result: None,
            error: Some(e.to_string()),
        })),
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state = AppState {
        _engine: Arc::new(ExecutionEngine::new()),
    };

    let app = Router::new()
        .route("/execute", post(execute_activity))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001")
        .await
        .expect("Failed to bind port 3001");

    tracing::info!("Activities server listening on http://0.0.0.0:3001");

    axum::serve(listener, app)
        .await
        .expect("Server failed");
}

