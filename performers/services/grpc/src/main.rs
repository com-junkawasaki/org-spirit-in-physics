// Merkle DAG: grpc.service.main
// gRPC service entry point using tonic + tonic-web
// Supports Connect protocol for browser access

mod lib;
mod services;
mod database;
mod auth;
mod error;

use tonic::transport::Server;
use tonic_web::GrpcWebLayer;
use tower_http::cors::{CorsLayer, Any};
use tower::ServiceBuilder;
use http::{Request, Response, StatusCode};
use hyper::body::Bytes;
use hyper_util::rt::TokioIo;
use tracing;
use std::convert::Infallible;

use database::PostgresPool;
use services::participants::ParticipantServiceImpl;
use services::sessions::SessionServiceImpl;
use services::timeline::TimelineServiceImpl;
use services::stimulus_words::StimulusWordServiceImpl;

// Generated proto types
use lib::generated::participants::v1::participant_service_server::ParticipantServiceServer;
use lib::generated::sessions::v1::session_service_server::SessionServiceServer;
use lib::generated::timeline::v1::timeline_service_server::TimelineServiceServer;
use lib::generated::stimulus_words::v1::stimulus_word_service_server::StimulusWordServiceServer;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    tracing::info!("Starting gRPC service...");

    // Load database URL from environment
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/spirit_in_physics".to_string());

    // Initialize database pool
    let pool = PostgresPool::new(&database_url).await?;
    tracing::info!("PostgreSQL connection pool initialized");

    // Get port from environment or use default
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "8083".to_string())
        .parse::<u16>()
        .unwrap_or(8083);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("gRPC service listening on 0.0.0.0:{}", port);
    tracing::info!("Connect protocol available at http://localhost:{}/spirit_in_physics.participants.v1.ParticipantService/", port);

    // Create service implementations
    let participant_service = ParticipantServiceImpl::new(pool.pool().clone());
    let session_service = SessionServiceImpl::new(pool.pool().clone());
    let timeline_service = TimelineServiceImpl::new(pool.pool().clone());
    let stimulus_word_service = StimulusWordServiceImpl::new(pool.pool().clone());

    // Health check handler
    async fn health_check(_req: Request<hyper::body::Incoming>) -> Result<Response<hyper::body::Body>, Infallible> {
        Ok(Response::builder()
            .status(StatusCode::OK)
            .header("Content-Type", "application/json")
            .body(hyper::body::Body::from(r#"{"status":"ok"}"#))
            .unwrap())
    }

    // Build gRPC server with tonic-web for Connect protocol support
    Server::builder()
        .accept_http1(true) // Enable HTTP/1.1 for Connect protocol
        .layer(
            ServiceBuilder::new()
                .layer(
                    CorsLayer::new()
                        .allow_origin(Any)
                        .allow_methods(Any)
                        .allow_headers(Any)
                        .expose_headers(Any)
                )
                .layer(GrpcWebLayer::new()) // Enable gRPC-Web / Connect protocol
        )
        // Health check endpoint
        .route("/health", tower::service_fn(health_check))
        .add_service(ParticipantServiceServer::new(participant_service))
        .add_service(SessionServiceServer::new(session_service))
        .add_service(TimelineServiceServer::new(timeline_service))
        .add_service(StimulusWordServiceServer::new(stimulus_word_service))
        .serve(addr)
        .await?;

    Ok(())
}

