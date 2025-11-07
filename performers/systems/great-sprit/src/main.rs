//! Great Spirit GPU Physics System - GraphQL Server Entry Point

use anyhow::Result;
use tracing::info;

mod config;
mod physics;
mod gpu;
mod kg;
mod graphql;
mod visualization;

use config::Config;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    info!("Starting Great Spirit GPU Physics System");

    // Load configuration
    let config = Config::load()?;
    info!("Configuration loaded: {:?}", config);

    // Initialize GPU device
    let gpu_device = gpu::device::GpuDevice::init().await?;
    info!("GPU device initialized");

    // Initialize TerminusDB connection
    let kg_client = kg::terminus::TerminusClient::new(&config).await?;
    info!("TerminusDB client initialized");

    // Start GraphQL server
    graphql::schema::start_server(config, gpu_device, kg_client).await?;

    Ok(())
}

