// Merkle DAG: import.service.import.participants
// Participant import logic

use crate::config::Config;
use crate::error::ImportError;
use crate::neo4j::client::Neo4jClient;
use crate::neo4j::transaction::execute_in_transaction;
use crate::types::{ConsentData, Participant};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;
use tracing::{info, warn, error};

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportResult {
    pub success: bool,
    pub total: usize,
    pub processed: usize,
    pub results: Vec<ParticipantResult>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ParticipantResult {
    pub participant_id: String,
    pub status: String,
    pub message: String,
    pub metadata: Option<serde_json::Value>,
}

pub async fn import_participants(
    client: &Neo4jClient,
    config: &Config,
) -> Result<ImportResult, ImportError> {
    let dataset_path = PathBuf::from(&config.dataset_path);

    if !dataset_path.exists() {
        return Err(ImportError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!("Dataset directory not found: {}", dataset_path.display()),
        )));
    }

    let mut entries = fs::read_dir(&dataset_path).await?;
    let mut participant_dirs = Vec::new();

    while let Some(entry) = entries.next_entry().await? {
        if entry.metadata().await?.is_dir() {
            participant_dirs.push(entry.path());
        }
    }

    let mut results = Vec::new();

    for participant_path in participant_dirs {
        let participant_id = participant_path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| ImportError::Validation("Invalid participant directory name".to_string()))?
            .to_string();

        let participant_id_clone = participant_id.clone();
        let participant_path_clone = participant_path.clone();

        // Process each participant in a separate transaction
        match execute_in_transaction(client, move |txn| {
            let pid = participant_id_clone.clone();
            let ppath = participant_path_clone.clone();
            Box::pin(async move {
                process_participant(txn, &pid, &ppath).await
            })
        })
        .await
        {
            Ok(result) => results.push(result),
            Err(e) => {
                error!("Error importing participant {}: {}", participant_id, e);
                results.push(ParticipantResult {
                    participant_id,
                    status: "error".to_string(),
                    message: e.to_string(),
                    metadata: None,
                });
            }
        }
    }

    Ok(ImportResult {
        success: true,
        total: participant_dirs.len(),
        processed: results.len(),
        results,
    })
}

async fn process_participant(
    txn: &mut crate::neo4j::client::Transaction,
    participant_id: &str,
    participant_path: &PathBuf,
) -> Result<ParticipantResult, ImportError> {
    // Check if participant already exists
    let mut check_params = HashMap::new();
    check_params.insert(
        "participant_id".to_string(),
        neo4rs::BoltType::String(participant_id.to_string()),
    );

    let check_query = r#"
        MATCH (p:Participant {id: $participant_id})
        RETURN p.id as id
        LIMIT 1
    "#;

    let check_rows = txn.execute(check_query, check_params).await?;
    if !check_rows.is_empty() {
        warn!("Participant {} already exists, skipping import", participant_id);
        return Ok(ParticipantResult {
            participant_id: participant_id.to_string(),
            status: "skipped".to_string(),
            message: "Participant already exists in database".to_string(),
            metadata: None,
        });
    }

    // Read consent.json
    let consent_path = participant_path.join("consent.json");
    if !consent_path.exists() {
        return Err(ImportError::Validation(format!(
            "consent.json not found for participant {}",
            participant_id
        )));
    }

    let consent_content = fs::read_to_string(&consent_path).await?;
    let consent_data: ConsentData = serde_json::from_str(&consent_content)?;

    // Validate consent data
    if consent_data.participant_id != participant_id {
        return Err(ImportError::Validation(format!(
            "Participant ID mismatch: expected {}, got {}",
            participant_id, consent_data.participant_id
        )));
    }

    // Check for related files
    let has_session_data = participant_path.join("session_data.json").exists();
    let has_video_files = check_video_files(&participant_path).await?;
    let has_hume_data = check_hume_data(&participant_path).await?;

    // Create participant node
    let mut create_params = HashMap::new();
    create_params.insert(
        "id".to_string(),
        neo4rs::BoltType::String(participant_id.to_string()),
    );
    create_params.insert(
        "signature".to_string(),
        neo4rs::BoltType::String(consent_data.signature),
    );
    create_params.insert(
        "agreed_at".to_string(),
        neo4rs::BoltType::String(consent_data.agreed_at),
    );
    create_params.insert(
        "agreements".to_string(),
        neo4rs::BoltType::String(serde_json::to_string(&consent_data.agreements)?),
    );
    create_params.insert(
        "has_session_data".to_string(),
        neo4rs::BoltType::Boolean(has_session_data),
    );
    create_params.insert(
        "has_video_files".to_string(),
        neo4rs::BoltType::Boolean(has_video_files),
    );
    create_params.insert(
        "has_hume_data".to_string(),
        neo4rs::BoltType::Boolean(has_hume_data),
    );
    create_params.insert(
        "imported_at".to_string(),
        neo4rs::BoltType::String(chrono::Utc::now().to_rfc3339()),
    );

    let create_query = r#"
        CREATE (p:Participant {
            id: $id,
            signature: $signature,
            agreed_at: $agreed_at,
            agreements: $agreements,
            has_session_data: $has_session_data,
            has_video_files: $has_video_files,
            has_hume_data: $has_hume_data,
            imported_at: $imported_at,
            created_at: datetime()
        })
        RETURN p.id as id
    "#;

    txn.execute(create_query, create_params).await?;

    info!("Participant {} imported successfully", participant_id);

    Ok(ParticipantResult {
        participant_id: participant_id.to_string(),
        status: "success".to_string(),
        message: "Participant imported successfully".to_string(),
        metadata: Some(serde_json::json!({
            "has_session_data": has_session_data,
            "has_video_files": has_video_files,
            "has_hume_data": has_hume_data
        })),
    })
}

async fn check_video_files(participant_path: &PathBuf) -> Result<bool, ImportError> {
    let video_dir = participant_path.join("videos");
    if !video_dir.exists() {
        return Ok(false);
    }

    let mut entries = fs::read_dir(&video_dir).await?;
    while let Some(entry) = entries.next_entry().await? {
        if entry.metadata().await?.is_file() {
            return Ok(true);
        }
    }

    Ok(false)
}

async fn check_hume_data(participant_path: &PathBuf) -> Result<bool, ImportError> {
    let mut entries = fs::read_dir(participant_path).await?;
    while let Some(entry) = entries.next_entry().await? {
        let file_name = entry.file_name();
        let file_name_str = file_name.to_string_lossy();
        if file_name_str.starts_with("HumeAI_artifacts_") && entry.metadata().await?.is_dir() {
            return Ok(true);
        }
    }

    Ok(false)
}

