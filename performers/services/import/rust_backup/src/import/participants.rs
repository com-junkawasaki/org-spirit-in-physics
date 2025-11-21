// Merkle DAG: import.service.import.participants
// Participant import logic using PostgreSQL + SQLx

use crate::config::Config;
use crate::error::ImportError;
use crate::types::{ConsentData, Participant};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Postgres, Transaction};
use std::path::PathBuf;
use tokio::fs;
use tracing::{info, warn, error};
use uuid::Uuid;

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
    pool: &PgPool,
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

    let total_count = participant_dirs.len();
    let mut results = Vec::new();

    for participant_path in participant_dirs {
        let participant_id = participant_path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| ImportError::Validation("Invalid participant directory name".to_string()))?
            .to_string();

        // Process each participant in a separate transaction
        let mut txn = pool.begin().await?;
        match process_participant(&mut txn, &participant_id, &participant_path).await {
            Ok(result) => {
                txn.commit().await?;
                results.push(result);
            }
            Err(e) => {
                txn.rollback().await?;
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
        total: total_count,
        processed: results.len(),
        results,
    })
}

async fn process_participant(
    txn: &mut Transaction<'_, Postgres>,
    participant_id: &str,
    participant_path: &PathBuf,
) -> Result<ParticipantResult, ImportError> {
    // Check if participant already exists
    let existing: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM participants WHERE id::text = $1 LIMIT 1"
    )
    .bind(participant_id)
    .fetch_optional(&mut **txn)
    .await?;

    if existing.is_some() {
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

    // Parse participant UUID
    let participant_uuid = Uuid::parse_str(participant_id)
        .map_err(|e| ImportError::Validation(format!("Invalid UUID format: {}", e)))?;

    // Parse agreed_at timestamp
    let agreed_at = chrono::DateTime::parse_from_rfc3339(&consent_data.agreed_at)
        .map_err(|e| ImportError::Validation(format!("Invalid timestamp format: {}", e)))?
        .with_timezone(&chrono::Utc);

    // Create participant
    sqlx::query(
        r#"
        INSERT INTO participants (id, created_at, updated_at)
        VALUES ($1, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
        "#
    )
    .bind(participant_uuid)
    .execute(&mut **txn)
    .await?;

    // Create participant consent
    sqlx::query(
        r#"
        INSERT INTO participant_consents (
            participant_id, signature, agreements, agreed_at, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (participant_id) DO UPDATE SET
            signature = EXCLUDED.signature,
            agreements = EXCLUDED.agreements,
            agreed_at = EXCLUDED.agreed_at,
            updated_at = NOW()
        "#
    )
    .bind(participant_uuid)
    .bind(&consent_data.signature)
    .bind(&consent_data.agreements)
    .bind(agreed_at)
    .execute(&mut **txn)
    .await?;

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
