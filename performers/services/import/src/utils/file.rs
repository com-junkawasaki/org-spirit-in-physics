// Merkle DAG: import.service.utils.file
// File system operations

use crate::error::ImportError;
use std::path::{Path, PathBuf};
use tokio::fs;

pub async fn find_hume_predictions_file(artifacts_dir: &Path) -> Result<Option<PathBuf>, ImportError> {
    let mut entries = fs::read_dir(artifacts_dir).await?;

    let mut predictions_file = None;
    while let Some(entry) = entries.next_entry().await? {
        let file_name = entry.file_name();
        let file_name_str = file_name.to_string_lossy();

        if file_name_str.starts_with("HumeAI_predictions_") && file_name_str.ends_with(".json") {
            predictions_file = Some(entry.path());
            break;
        }
    }

    Ok(predictions_file)
}

pub async fn find_all_registry_csv_directories(artifacts_dir: &Path) -> Result<Vec<PathBuf>, ImportError> {
    let mut csv_directories = Vec::new();
    let mut entries = fs::read_dir(artifacts_dir).await?;

    while let Some(entry) = entries.next_entry().await? {
        let file_name = entry.file_name();
        let file_name_str = file_name.to_string_lossy();

        if file_name_str.starts_with("registry_file-") && entry.metadata().await?.is_dir() {
            let registry_path = entry.path();
            let csv_path = registry_path.join("csv");

            if csv_path.exists() && csv_path.is_dir() {
                let mut csv_entries = fs::read_dir(&csv_path).await?;
                while let Some(csv_entry) = csv_entries.next_entry().await? {
                    if csv_entry.metadata().await?.is_dir() {
                        csv_directories.push(csv_entry.path());
                    }
                }
            }
        }
    }

    Ok(csv_directories)
}

pub async fn find_hume_artifacts_directory(participant_path: &Path) -> Result<Option<PathBuf>, ImportError> {
    let entries = fs::read_dir(participant_path).await?;

    for entry in entries {
        let entry = entry?;
        let file_name = entry.file_name();
        let file_name_str = file_name.to_string_lossy();

        if file_name_str.starts_with("HumeAI_artifacts_") && entry.metadata().await?.is_dir() {
            return Ok(Some(entry.path()));
        }
    }

    Ok(None)
}

