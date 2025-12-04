// Merkle DAG: grpc.service.main
// gRPC service entry point using tonic + tonic-web
// Supports Connect protocol for browser access

use grpc_service::database::PostgresPool;
use grpc_service::services::participants::ParticipantServiceImpl;
use grpc_service::services::sessions::SessionServiceImpl;
use grpc_service::services::timeline::TimelineServiceImpl;
use grpc_service::services::stimulus_words::StimulusWordServiceImpl;

use tonic::transport::Server;
use tonic_web::GrpcWebLayer;
use tower_http::cors::{CorsLayer, Any};
use tower::ServiceBuilder;
use http::{Request, Response, StatusCode};
use tracing;
use std::convert::Infallible;

// Generated proto types
use grpc_service::generated::participants::v1::participant_service_server::ParticipantServiceServer;
use grpc_service::generated::sessions::v1::session_service_server::SessionServiceServer;
use grpc_service::generated::timeline::v1::timeline_service_server::TimelineServiceServer;
use grpc_service::generated::stimulus_words::v1::stimulus_word_service_server::StimulusWordServiceServer;

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
        .add_service(ParticipantServiceServer::new(participant_service))
        .add_service(SessionServiceServer::new(session_service))
        .add_service(TimelineServiceServer::new(timeline_service))
        .add_service(StimulusWordServiceServer::new(stimulus_word_service))
        .serve(addr)
        .await?;

    Ok(())
}

