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
    // Set panic hook to capture panics
    std::panic::set_hook(Box::new(|panic_info| {
        eprintln!("PANIC: {:?}", panic_info);
        if let Some(location) = panic_info.location() {
            eprintln!("Location: {}:{}:{}", location.file(), location.line(), location.column());
        }
        if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
            eprintln!("Message: {}", s);
        } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
            eprintln!("Message: {}", s);
        }
    }));
    
    // Force unbuffered output
    use std::io::Write;
    std::io::stderr().flush().ok();
    std::io::stdout().flush().ok();
    
    eprintln!("=== MAIN FUNCTION STARTED ===");
    std::io::stderr().flush().ok();
    
    // Initialize tracing with better output
    eprintln!("Initializing tracing...");
    std::io::stderr().flush().ok();
    
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_writer(std::io::stderr)
        .init();
    
    eprintln!("Tracing initialized");
    std::io::stderr().flush().ok();

    println!("Starting Great Spirit GPU Physics System");
    std::io::stdout().flush().ok();
    eprintln!("Starting Great Spirit GPU Physics System");
    std::io::stderr().flush().ok();
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

