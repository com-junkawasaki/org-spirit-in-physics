// Merkle DAG: import.service.import.sessions
// Session import logic using PostgreSQL + SQLx

use crate::config::Config;
use crate::error::ImportError;
use crate::types::Session;
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
    pub results: Vec<SessionResult>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionResult {
    pub participant_id: String,
    pub status: String,
    pub message: String,
    pub statistics: Option<SessionStatistics>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionStatistics {
    pub total_events: usize,
    pub word_responses_count: usize,
    pub average_reaction_time: f64,
    pub session_duration: i64,
}

pub async fn import_sessions(
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
        match process_session(&mut txn, &participant_id, &participant_path).await {
            Ok(result) => {
                txn.commit().await?;
                results.push(result);
            }
            Err(e) => {
                txn.rollback().await?;
                error!("Error importing session for participant {}: {}", participant_id, e);
                results.push(SessionResult {
                    participant_id,
                    status: "error".to_string(),
                    message: e.to_string(),
                    statistics: None,
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

async fn process_session(
    txn: &mut Transaction<'_, Postgres>,
    participant_id: &str,
    participant_path: &PathBuf,
) -> Result<SessionResult, ImportError> {
    // Check if participant exists
    let participant_uuid = Uuid::parse_str(participant_id)
        .map_err(|e| ImportError::Validation(format!("Invalid UUID format: {}", e)))?;

    let existing: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM participants WHERE id = $1 LIMIT 1"
    )
    .bind(participant_uuid)
    .fetch_optional(&mut **txn)
    .await?;

    if existing.is_none() {
        return Err(ImportError::ParticipantNotFound(participant_id.to_string()));
    }

    // Read session_data.json
    let session_data_path = participant_path.join("session_data.json");
    if !session_data_path.exists() {
        return Ok(SessionResult {
            participant_id: participant_id.to_string(),
            status: "skipped".to_string(),
            message: "session_data.json not found".to_string(),
            statistics: None,
        });
    }

    let session_content = fs::read_to_string(&session_data_path).await?;
    let session_data: serde_json::Value = serde_json::from_str(&session_content)?;

    let events = session_data
        .get("events")
        .and_then(|e| e.as_array())
        .ok_or_else(|| ImportError::Validation("Invalid session data: events array not found".to_string()))?;

    // Extract session start and end times
    let session_started_event = events
        .iter()
        .find(|e| e.get("type").and_then(|t| t.as_str()) == Some("session_started"));

    let session_ended_event = events
        .iter()
        .rev()
        .find(|e| e.get("type").and_then(|t| t.as_str()) == Some("response_window_closed"));

    let start_time = session_started_event
        .and_then(|e| e.get("timestamp"))
        .and_then(|t| t.as_str())
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.timestamp_millis())
        .unwrap_or_else(|| {
            events
                .first()
                .and_then(|e| e.get("timestamp"))
                .and_then(|t| t.as_str())
                .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
                .map(|dt| dt.timestamp_millis())
                .unwrap_or_else(|| chrono::Utc::now().timestamp_millis())
        });

    let end_time = session_ended_event
        .and_then(|e| e.get("timestamp"))
        .and_then(|t| t.as_str())
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.timestamp_millis());

    let session_index = 0;
    let session_uuid = Uuid::new_v4();

    // Check if session already exists
    let existing_session: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM sessions WHERE participant_id = $1 AND session_index = $2 LIMIT 1"
    )
    .bind(participant_uuid)
    .bind(session_index)
    .fetch_optional(&mut **txn)
    .await?;

    if existing_session.is_some() {
        warn!("Session for participant {} with index {} already exists, skipping import", participant_id, session_index);
        return Ok(SessionResult {
            participant_id: participant_id.to_string(),
            status: "skipped".to_string(),
            message: "Session already exists in database".to_string(),
            statistics: None,
        });
    }

    // Create session
    sqlx::query(
        r#"
        INSERT INTO sessions (id, participant_id, session_index, start_ts, end_ts, events, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        "#
    )
    .bind(session_uuid)
    .bind(participant_uuid)
    .bind(session_index)
    .bind(start_time)
    .bind(end_time)
    .bind(events)
    .execute(&mut **txn)
    .await?;

    // Calculate statistics
    let word_responses = events
        .iter()
        .filter(|e| e.get("type").and_then(|t| t.as_str()) == Some("word_displayed"))
        .count();

    let reaction_times: Vec<f64> = events
        .iter()
        .filter_map(|e| {
            if e.get("type").and_then(|t| t.as_str()) == Some("response_window_closed") {
                e.get("reactionTime").and_then(|rt| rt.as_f64())
            } else {
                None
            }
        })
        .collect();

    let average_reaction_time = if !reaction_times.is_empty() {
        reaction_times.iter().sum::<f64>() / reaction_times.len() as f64
    } else {
        0.0
    };

    let session_duration = end_time.map(|et| et - start_time).unwrap_or(0);

    info!("Session {} imported successfully for participant {}", session_uuid, participant_id);

    Ok(SessionResult {
        participant_id: participant_id.to_string(),
        status: "success".to_string(),
        message: "Session data imported successfully".to_string(),
        statistics: Some(SessionStatistics {
            total_events: events.len(),
            word_responses_count: word_responses,
            average_reaction_time,
            session_duration,
        }),
    })
}
