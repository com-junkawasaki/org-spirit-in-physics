use std::env;
use std::path::PathBuf;
use anyhow::Result;
use tracing::{info, error};

use importer::import_participant_dataset;

fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"))
        )
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    // Get dataset folder path from command line arguments
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: {} <dataset_folder_path>", args[0]);
        eprintln!("Example: {} /path/to/participant/folder", args[0]);
        std::process::exit(1);
    }

    let dataset_path = PathBuf::from(&args[1]);
    
    if !dataset_path.exists() {
        error!("Dataset folder does not exist: {:?}", dataset_path);
        std::process::exit(1);
    }

    info!("Starting import for dataset: {:?}", dataset_path);

    // Run the import
    match import_participant_dataset(&dataset_path) {
        Ok(_) => {
            info!("Import completed successfully");
            Ok(())
        }
        Err(e) => {
            error!("Import failed: {}", e);
            Err(e)
        }
    }
}

