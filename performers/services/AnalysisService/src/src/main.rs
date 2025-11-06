//! Analyzer HTTP Server
//! 
//! Merkle DAG: analyzer.main
//! OWL: spirit:AnalysisPipeline HTTP API

use axum::{
    extract::Path,
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing_subscriber;

use spirit_analyzer::pipeline::PipelineEngine;
use serde_json::json;

#[derive(Clone)]
struct AppState {
    engine: Arc<PipelineEngine>,
}

#[derive(Deserialize)]
struct AnalyzeRequest {
    participant_id: String,
    experiment_id: Option<String>,
}

#[derive(Serialize)]
struct AnalyzeResponse {
    success: bool,
    participant_id: String,
    results_count: usize,
    error: Option<String>,
}

#[derive(Serialize)]
struct StatusResponse {
    status: String,
    message: String,
}

/// POST /analyze - Execute analysis for a participant
async fn analyze(
    state: axum::extract::State<AppState>,
    Json(request): Json<AnalyzeRequest>,
) -> Result<Json<AnalyzeResponse>, StatusCode> {
    match state.engine.execute(request.participant_id.clone(), request.experiment_id).await {
        Ok(context) => Ok(Json(AnalyzeResponse {
            success: true,
            participant_id: context.participant_id,
            results_count: context.analysis_results.len(),
            error: None,
        })),
        Err(e) => Ok(Json(AnalyzeResponse {
            success: false,
            participant_id: request.participant_id,
            results_count: 0,
            error: Some(e.to_string()),
        })),
    }
}

/// POST /batch-analyze - Execute batch analysis
async fn batch_analyze(
    state: axum::extract::State<AppState>,
    Json(request): Json<Vec<String>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    match state.engine.execute_batch(request).await {
        Ok(contexts) => Ok(Json(json!({
            "success": true,
            "processed": contexts.len(),
            "results": contexts.iter().map(|c| json!({
                "participant_id": c.participant_id,
                "results_count": c.analysis_results.len(),
            })).collect::<Vec<_>>(),
        }))),
        Err(e) => Ok(Json(json!({
            "success": false,
            "error": e.to_string(),
        }))),
    }
}

/// GET /status/:id - Get analysis status
async fn status(Path(id): Path<String>) -> Json<StatusResponse> {
    // TODO: Implement actual status tracking
    Json(StatusResponse {
        status: "unknown".to_string(),
        message: format!("Status check for {}", id),
    })
}

/// GET /health - Health check
async fn health() -> Json<StatusResponse> {
    Json(StatusResponse {
        status: "healthy".to_string(),
        message: "Analyzer service is running".to_string(),
    })
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state = AppState {
        engine: Arc::new(PipelineEngine::new()),
    };

    let app = Router::new()
        .route("/analyze", post(analyze))
        .route("/batch-analyze", post(batch_analyze))
        .route("/status/:id", get(status))
        .route("/health", get(health))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3002")
        .await
        .expect("Failed to bind port 3002");

    tracing::info!("Analyzer server listening on http://0.0.0.0:3002");

    axum::serve(listener, app)
        .await
        .expect("Server failed");
}

