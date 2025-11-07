//! Great Spirit GPU Physics System - GraphQL Server Entry Point

use anyhow::Result;
use tracing::info;

mod config;
mod physics;
mod gpu;
mod kg;
mod graphql;
mod visualization;
mod emotion;
mod capture;
mod identity;
mod pipeline;

use config::Config;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    println!("Starting Great Spirit GPU Physics System");
    eprintln!("Starting Great Spirit GPU Physics System (stderr)");
    info!("Starting Great Spirit GPU Physics System");

    // Load configuration
    let config = match Config::load() {
        Ok(c) => {
            info!("Configuration loaded: {:?}", c);
            c
        }
        Err(e) => {
            eprintln!("Failed to load configuration: {:?}", e);
            return Err(e);
        }
    };

    // Initialize GPU device
    let gpu_device = match gpu::device::GpuDevice::init().await {
        Ok(device) => {
            info!("GPU device initialized");
            device
        }
        Err(e) => {
            eprintln!("Failed to initialize GPU device: {:?}", e);
            return Err(e);
        }
    };

    // Initialize TerminusDB connection
    let kg_client = match kg::terminus::TerminusClient::new(&config).await {
        Ok(client) => {
            info!("TerminusDB client initialized");
            client
        }
        Err(e) => {
            eprintln!("Failed to initialize TerminusDB client: {:?}", e);
            return Err(e);
        }
    };

    // Start GraphQL server
    info!("Starting GraphQL server on port {}", config.server_port);
    if let Err(e) = graphql::schema::start_server(config, gpu_device, kg_client).await {
        eprintln!("GraphQL server error: {:?}", e);
        return Err(e);
    }

    Ok(())
}

