// Merkle DAG: import.service.import.sessions
// Session import logic

use crate::config::Config;
use crate::error::ImportError;
use crate::neo4j::client::Neo4jClient;
use crate::neo4j::transaction::execute_in_transaction;
use crate::types::Session;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;
use tracing::{info, warn, error};
use neo4rs::BoltString;

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
    client: &mut Neo4jClient,
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
                process_session(txn, &pid, &ppath).await
            })
        })
        .await
        {
            Ok(result) => results.push(result),
            Err(e) => {
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

    let total_count = participant_dirs.len();
    Ok(ImportResult {
        success: true,
        total: total_count,
        processed: results.len(),
        results,
    })
}

async fn process_session(
    txn: &mut crate::neo4j::client::Transaction,
    participant_id: &str,
    participant_path: &PathBuf,
) -> Result<SessionResult, ImportError> {
    // Check if participant exists
    let mut check_params = HashMap::new();
    check_params.insert(
        "participant_id".to_string(),
        neo4rs::BoltType::String(BoltString::from(participant_id.to_string())),
    );

    let check_query = r#"
        MATCH (p:Participant {id: $participant_id})
        RETURN p.id as id
        LIMIT 1
    "#;

    let check_rows: Vec<neo4rs::Row> = txn.execute(check_query.to_string(), check_params).await?;
    if check_rows.is_empty() {
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
    let session_id = format!("{}-{}", participant_id, session_index);

    // Check if session already exists
    let mut session_check_params = HashMap::new();
    session_check_params.insert(
        "session_id".to_string(),
        neo4rs::BoltType::String(BoltString::from(session_id.clone())),
    );

    let session_check_query = r#"
        MATCH (s:Session {id: $session_id})
        RETURN s.id as id
        LIMIT 1
    "#;

    let session_check_rows: Vec<neo4rs::Row> = txn.execute(session_check_query.to_string(), session_check_params).await?;
    if !session_check_rows.is_empty() {
        warn!("Session {} already exists, skipping import", session_id);
        return Ok(SessionResult {
            participant_id: participant_id.to_string(),
            status: "skipped".to_string(),
            message: "Session already exists in database".to_string(),
            statistics: None,
        });
    }

    // Create session node
    let mut create_params = HashMap::new();
    create_params.insert(
        "participant_id".to_string(),
        neo4rs::BoltType::String(BoltString::from(participant_id.to_string())),
    );
    create_params.insert(
        "session_id".to_string(),
        neo4rs::BoltType::String(BoltString::from(session_id.clone())),
    );
    create_params.insert(
        "session_index".to_string(),
        neo4rs::BoltType::Integer(session_index),
    );
    create_params.insert(
        "start_ts".to_string(),
        neo4rs::BoltType::Integer(start_time),
    );
    create_params.insert(
        "end_ts".to_string(),
        end_time.map(neo4rs::BoltType::Integer)
            .unwrap_or(neo4rs::BoltType::Null),
    );
    create_params.insert(
        "events".to_string(),
        neo4rs::BoltType::String(BoltString::from(serde_json::to_string(events)?)),
    );
    create_params.insert(
        "created_at".to_string(),
        neo4rs::BoltType::String(BoltString::from(chrono::Utc::now().to_rfc3339())),
    );

    let create_query = r#"
        MATCH (p:Participant {id: $participant_id})
        MERGE (s:Session {id: $session_id})
        SET s.participant_id = $participant_id,
            s.session_index = $session_index,
            s.start_ts = $start_ts,
            s.end_ts = $end_ts,
            s.events = $events,
            s.created_at = $created_at
        MERGE (p)-[:HAS_SESSION]->(s)
        RETURN s.id as id
    "#;

    txn.execute(create_query.to_string(), create_params).await?;

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

    info!("Session {} imported successfully", session_id);

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

