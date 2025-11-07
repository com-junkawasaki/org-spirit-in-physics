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

fn main() {
    // Set panic hook BEFORE tokio runtime
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
    
    use std::io::Write;
    eprintln!("=== BEFORE TOKIO RUNTIME ===");
    std::io::stderr().lock().flush().ok();
    
    // Create tokio runtime explicitly
    let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
    eprintln!("=== TOKIO RUNTIME CREATED ===");
    std::io::stderr().lock().flush().ok();
    
    if let Err(e) = rt.block_on(async_main()) {
        eprintln!("Application error: {:?}", e);
        std::process::exit(1);
    }
}

async fn async_main() -> Result<()> {
    // Force unbuffered output
    use std::io::Write;
    std::io::stderr().lock().flush().ok();
    std::io::stdout().lock().flush().ok();
    
    eprintln!("=== ASYNC MAIN FUNCTION STARTED ===");
    std::io::stderr().lock().flush().ok();
    
    // Initialize tracing with better output
    eprintln!("Initializing tracing...");
    std::io::stderr().lock().flush().ok();
    
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_writer(std::io::stderr)
        .init();
    
    eprintln!("Tracing initialized");
    std::io::stderr().lock().flush().ok();

    println!("Starting Great Spirit GPU Physics System");
    std::io::stdout().lock().flush().ok();
    eprintln!("Starting Great Spirit GPU Physics System");
    std::io::stderr().lock().flush().ok();
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

