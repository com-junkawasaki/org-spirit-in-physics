mod db;
mod models;
mod processor;

use anyhow::Result;
use db::establish_connection;
use diesel_async::pooled_connection::deadpool::Pool;
use diesel_async::AsyncPgConnection;
use std::env;
use tracing::{info, error};
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();


    info!("Connecting to database...");
    let pool = establish_connection().await?;
    info!("Database connection established");

    // Parse command line arguments
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 2 {
        eprintln!("Usage: {} <participant_id> [--incremental]", args[0]);
        eprintln!("  participant_id: UUID of the participant to process");
        eprintln!("  --incremental: Only process new data since last computation");
        std::process::exit(1);
    }

    let participant_id_str = &args[1];
    let participant_id = Uuid::parse_str(participant_id_str)
        .map_err(|e| anyhow::anyhow!("Invalid participant ID '{}': {}", participant_id_str, e))?;

    let incremental = args.contains(&"--incremental".to_string());

    info!("Processing timeline for participant: {}", participant_id);
    info!("Mode: {}", if incremental { "incremental" } else { "full" });

    // Process timeline
    match processor::process_participant_timeline(&pool, participant_id, incremental).await {
        Ok(_) => {
            info!("Timeline processing completed successfully");
            Ok(())
        }
        Err(e) => {
            error!("Timeline processing failed: {}", e);
            Err(e)
        }
    }
}

