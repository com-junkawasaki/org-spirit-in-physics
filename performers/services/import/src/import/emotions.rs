// Merkle DAG: import.service.import.emotions
// Emotion import logic with type-level session dependency

use crate::config::Config;
use crate::error::ImportError;
use crate::neo4j::client::Neo4jClient;
use crate::neo4j::transaction::execute_in_transaction;
use crate::types::ValidatedSessionId;
use crate::utils::{find_hume_artifacts_directory, find_hume_predictions_file, find_all_registry_csv_directories, parse_csv_file};
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
    pub results: Vec<EmotionResult>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmotionResult {
    pub participant_id: String,
    pub status: String,
    pub message: String,
    pub statistics: Option<EmotionStatistics>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmotionStatistics {
    pub emotion_entries: usize,
    pub csv_files_processed: usize,
    pub total_emotions: usize,
}

const EMOTION_KEYS: &[&str] = &[
    "Admiration", "Adoration", "Aesthetic Appreciation", "Amusement", "Anger", "Anxiety",
    "Awe", "Awkwardness", "Boredom", "Calmness", "Concentration", "Contemplation",
    "Confusion", "Contempt", "Contentment", "Craving", "Determination", "Disappointment",
    "Disgust", "Distress", "Doubt", "Ecstasy", "Embarrassment", "Empathic Pain",
    "Entrancement", "Envy", "Excitement", "Fear", "Guilt", "Horror", "Interest", "Joy",
    "Love", "Nostalgia", "Pain", "Pride", "Realization", "Relief", "Romance", "Sadness",
    "Satisfaction", "Desire", "Shame", "Surprise (negative)", "Surprise (positive)",
    "Sympathy", "Tiredness", "Triumph",
];

const VOCAL_KEYS: &[&str] = &[
    "Cackle", "Cheer", "Chuckle", "Cry", "Gasp", "Giggle", "Groan", "Growl", "Grunt",
    "Hiss", "Hoot", "Howl", "Laugh", "Moan", "Pant", "Roar", "Scream", "Screech",
    "Shout", "Shriek", "Sigh", "Snicker", "Snort", "Sob", "Squeal", "Wail", "Wheep",
    "Whimper", "Yawn", "Yelp", "Ah", "Aha", "Ahh", "Argh", "Aww", "Eek", "Eww", "Grr",
    "Ha", "Hah", "Haha", "Hehe", "Hmm", "Huh", "Hurray", "Mhm", "Mmm", "Oh", "Ohh",
    "Ooh", "Ooph", "Ouch", "Oww", "Pff", "Phew", "Tsk", "Ugh", "Uh", "Uh-huh", "Umm",
    "Whee", "Whew", "Woah", "Wow", "Yay", "Yippee", "Yuck",
];

const AU_KEYS: &[&str] = &[
    "AU1 Inner Brow Raise", "AU2 Outer Brow Raise", "AU4 Brow Lowerer", "AU5 Upper Lid Raise",
    "AU6 Cheek Raise", "AU7 Lids Tight", "AU9 Nose Wrinkle", "AU10 Upper Lip Raiser",
    "AU11 Nasolabial Furrow Deepener", "AU12 Lip Corner Puller", "AU14 Dimpler",
    "AU15 Lip Corner Depressor", "AU16 Lower Lip Depress", "AU17 Chin Raiser",
    "AU18 Lip Pucker", "AU19 Tongue Show", "AU20 Lip Stretch", "AU22 Lip Funneler",
    "AU23 Lip Tightener", "AU24 Lip Presser", "AU25 Lips Part", "AU26 Jaw Drop",
    "AU27 Mouth Stretch", "AU28 Lips Suck", "AU32 Bite", "AU34 Puff", "AU37 Lip Wipe",
    "AU38 Nostril Dilate", "AU43 Eye Closure", "AU53 Head Up", "AU54 Head Down",
];

pub async fn import_emotions(
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

        // Process each participant in a separate transaction
        match execute_in_transaction(client, |txn| {
            Box::pin(async move {
                process_emotions(txn, &participant_id, &participant_path).await
            })
        })
        .await
        {
            Ok(result) => results.push(result),
            Err(e) => {
                error!("Error importing emotions for participant {}: {}", participant_id, e);
                results.push(EmotionResult {
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
        total: participant_dirs.len(),
        processed: results.len(),
        results,
    })
}

async fn process_emotions(
    txn: &mut crate::neo4j::client::Transaction,
    participant_id: &str,
    participant_path: &PathBuf,
) -> Result<EmotionResult, ImportError> {
    // Check if participant exists
    let mut check_params = HashMap::new();
    check_params.insert(
        "participant_id".to_string(),
        neo4rs::types::BoltType::String(participant_id.to_string()),
    );

    let check_query = r#"
        MATCH (p:Participant {id: $participant_id})
        RETURN p.id as id
        LIMIT 1
    "#;

    let check_rows = txn.execute(check_query, check_params).await?;
    if check_rows.is_empty() {
        return Err(ImportError::ParticipantNotFound(participant_id.to_string()));
    }

    // Find HumeAI artifacts directory
    let hume_artifacts_dir = match find_hume_artifacts_directory(participant_path).await? {
        Some(dir) => dir,
        None => {
            return Ok(EmotionResult {
                participant_id: participant_id.to_string(),
                status: "skipped".to_string(),
                message: "Hume AI artifacts directory not found".to_string(),
                statistics: None,
            });
        }
    };

    // Get session ID and validate it (type-level dependency)
    let validated_session_id = ValidatedSessionId::from_participant(participant_id, txn).await?;

    // Delete existing emotion data
    delete_existing_emotion_data(txn, participant_id).await?;

    // Process predictions JSON file
    let predictions_file = find_hume_predictions_file(&hume_artifacts_dir).await?;
    let mut emotion_entries_count = 0;
    let mut total_emotions = 0;

    if let Some(predictions_path) = predictions_file {
        let predictions_content = fs::read_to_string(&predictions_path).await?;
        let predictions_data: serde_json::Value = serde_json::from_str(&predictions_content)?;
        
        let (entries, emotions) = process_emotion_data(&predictions_data)?;
        emotion_entries_count += entries;
        total_emotions += emotions;

        // Store emotion entries
        for entry in extract_emotion_entries(&predictions_data)? {
            store_emotion_entry(txn, &validated_session_id, participant_id, &entry).await?;
        }
    }

    // Process all CSV directories
    let csv_directories = find_all_registry_csv_directories(&hume_artifacts_dir).await?;
    let mut csv_files_processed = 0;

    for csv_dir in csv_directories {
        let csv_files = vec!["burst.csv", "face.csv", "language.csv", "prosody.csv"];
        
        for csv_file in csv_files {
            let csv_path = csv_dir.join(csv_file);
            if csv_path.exists() {
                match process_csv_file(txn, &validated_session_id, participant_id, &csv_path, csv_file).await {
                    Ok(count) => {
                        csv_files_processed += 1;
                        total_emotions += count;
                    }
                    Err(e) => {
                        warn!("Error processing CSV file {}: {}", csv_path.display(), e);
                    }
                }
            }
        }
    }

    info!("Emotions imported for participant {}: {} entries, {} CSV files", 
          participant_id, emotion_entries_count, csv_files_processed);

    Ok(EmotionResult {
        participant_id: participant_id.to_string(),
        status: "success".to_string(),
        message: "Emotion data imported successfully".to_string(),
        statistics: Some(EmotionStatistics {
            emotion_entries: emotion_entries_count,
            csv_files_processed,
            total_emotions,
        }),
    })
}


async fn delete_existing_emotion_data(
    txn: &mut crate::neo4j::client::Transaction,
    participant_id: &str,
) -> Result<(), ImportError> {
    let mut params = HashMap::new();
    params.insert(
        "participant_id".to_string(),
        neo4rs::types::BoltType::String(participant_id.to_string()),
    );

    let query = r#"
        MATCH (p:Participant {id: $participant_id})-[:HAS_SESSION]->(s:Session)
        OPTIONAL MATCH (s)-[r1:HAS_BURST_EMOTION_DATA]->(b:BurstEmotionData)
        OPTIONAL MATCH (s)-[r2:HAS_FACE_EMOTION_DATA]->(f:FaceEmotionData)
        OPTIONAL MATCH (s)-[r3:HAS_LANGUAGE_EMOTION_DATA]->(l:LanguageEmotionData)
        OPTIONAL MATCH (s)-[r4:HAS_PROSODY_EMOTION_DATA]->(pr:ProsodyEmotionData)
        DETACH DELETE b, f, l, pr
    "#;

    txn.execute(query, params).await?;
    Ok(())
}

fn process_emotion_data(predictions_data: &serde_json::Value) -> Result<(usize, usize), ImportError> {
    let mut entries_processed = 0;
    let mut total_emotions = 0;

    // Handle various structures of predictions data
    let entries = extract_predictions_entries(predictions_data)?;

    for entry in entries {
        if let Some(emotions) = entry.get("emotions").and_then(|e| e.as_array()) {
            entries_processed += 1;
            total_emotions += emotions.len();
        }
    }

    Ok((entries_processed, total_emotions))
}

fn extract_predictions_entries(data: &serde_json::Value) -> Result<Vec<&serde_json::Value>, ImportError> {
    let mut entries = Vec::new();

    if let Some(array) = data.as_array() {
        for item in array {
            if let Some(results) = item.get("results").and_then(|r| r.as_array()) {
                entries.extend(results.iter());
            } else if let Some(predictions) = item.get("predictions").and_then(|p| p.as_array()) {
                entries.extend(predictions.iter());
            }
        }
    } else if let Some(results) = data.get("results").and_then(|r| r.as_array()) {
        entries.extend(results.iter());
    } else if let Some(predictions) = data.get("predictions").and_then(|p| p.as_array()) {
        entries.extend(predictions.iter());
    }

    Ok(entries)
}

fn extract_emotion_entries(data: &serde_json::Value) -> Result<Vec<EmotionEntryData>, ImportError> {
    let mut entries = Vec::new();
    let predictions_entries = extract_predictions_entries(data)?;

    for entry in predictions_entries {
        if let Some(emotions_array) = entry.get("emotions").and_then(|e| e.as_array()) {
            let text = entry.get("text").and_then(|t| t.as_str()).map(|s| s.to_string());
            let begin_time = entry.get("time")
                .and_then(|t| t.get("begin"))
                .and_then(|b| b.as_f64())
                .or_else(|| entry.get("begin_time").and_then(|b| b.as_f64()));
            let end_time = entry.get("time")
                .and_then(|t| t.get("end"))
                .and_then(|e| e.as_f64())
                .or_else(|| entry.get("end_time").and_then(|e| e.as_f64()));
            let confidence = entry.get("confidence").and_then(|c| c.as_f64()).unwrap_or(0.5);

            let emotion_scores: Vec<(String, f64)> = emotions_array
                .iter()
                .filter_map(|e| {
                    let name = e.get("name").or_else(|| e.get("emotion"))?.as_str()?.to_string();
                    let score = e.get("score").or_else(|| e.get("value"))?.as_f64()?;
                    Some((name, score))
                })
                .collect();

            entries.push(EmotionEntryData {
                text,
                begin_time,
                end_time,
                confidence,
                emotion_scores,
            });
        }
    }

    Ok(entries)
}

#[derive(Debug)]
struct EmotionEntryData {
    text: Option<String>,
    begin_time: Option<f64>,
    end_time: Option<f64>,
    confidence: f64,
    emotion_scores: Vec<(String, f64)>,
}

async fn store_emotion_entry(
    txn: &mut crate::neo4j::client::Transaction,
    session_id: &ValidatedSessionId,
    participant_id: &str,
    entry: &EmotionEntryData,
) -> Result<(), ImportError> {
    let node_id = format!("emotion_{}_{}", chrono::Utc::now().timestamp_millis(), uuid::Uuid::new_v4());
    
    let mut params = HashMap::new();
    params.insert("session_id".to_string(), neo4rs::types::BoltType::String(session_id.as_str().to_string()));
    params.insert("node_id".to_string(), neo4rs::types::BoltType::String(node_id));
    params.insert("participant_id".to_string(), neo4rs::types::BoltType::String(participant_id.to_string()));
    params.insert("text".to_string(), entry.text.as_ref().map(|t| neo4rs::types::BoltType::String(t.clone())).unwrap_or(neo4rs::types::BoltType::Null));
    params.insert("begin_time".to_string(), entry.begin_time.map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));
    params.insert("end_time".to_string(), entry.end_time.map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));
    params.insert("confidence".to_string(), neo4rs::types::BoltType::Float(entry.confidence));
    
    let emotion_data: serde_json::Value = entry.emotion_scores.iter()
        .map(|(name, score)| (name.clone(), *score))
        .collect();
    params.insert("emotion_data".to_string(), neo4rs::types::BoltType::String(serde_json::to_string(&emotion_data)?));

    let query = r#"
        MATCH (s:Session {id: $session_id})
        CREATE (e:EmotionEntry {
            id: $node_id,
            participant_id: $participant_id,
            session_id: $session_id,
            text: $text,
            begin_time: $begin_time,
            end_time: $end_time,
            confidence: $confidence,
            emotion_data: $emotion_data,
            created_at: datetime()
        })
        CREATE (s)-[:HAS_EMOTION_ENTRY]->(e)
    "#;

    txn.execute(query, params).await?;
    Ok(())
}

async fn process_csv_file(
    txn: &mut crate::neo4j::client::Transaction,
    session_id: &ValidatedSessionId,
    participant_id: &str,
    csv_path: &PathBuf,
    csv_type: &str,
) -> Result<usize, ImportError> {
    let content = fs::read_to_string(csv_path).await?;
    let records = parse_csv_file(&content)?;

    let mut count = 0;

    match csv_type {
        "burst.csv" => {
            for record in records {
                store_burst_emotion_data(txn, session_id, participant_id, &record).await?;
                count += 1;
            }
        }
        "face.csv" => {
            for record in records {
                store_face_emotion_data(txn, session_id, participant_id, &record).await?;
                count += 1;
            }
        }
        "language.csv" => {
            for record in records {
                store_language_emotion_data(txn, session_id, participant_id, &record).await?;
                count += 1;
            }
        }
        "prosody.csv" => {
            for record in records {
                store_prosody_emotion_data(txn, session_id, participant_id, &record).await?;
                count += 1;
            }
        }
        _ => {
            return Err(ImportError::Validation(format!("Unknown CSV type: {}", csv_type)));
        }
    }

    Ok(count)
}

async fn store_burst_emotion_data(
    txn: &mut crate::neo4j::client::Transaction,
    session_id: &ValidatedSessionId,
    participant_id: &str,
    record: &HashMap<String, String>,
) -> Result<(), ImportError> {
    let record_id = record.get("Id").unwrap_or(&"unknown".to_string()).clone();
    let begin_time = record.get("BeginTime").and_then(|s| s.parse::<f64>().ok());
    let end_time = record.get("EndTime").and_then(|s| s.parse::<f64>().ok());

    // Check for duplicates
    let mut check_params = HashMap::new();
    check_params.insert("session_id".to_string(), neo4rs::types::BoltType::String(session_id.as_str().to_string()));
    check_params.insert("record_id".to_string(), neo4rs::types::BoltType::String(record_id.clone()));
    check_params.insert("begin_time".to_string(), begin_time.map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));
    check_params.insert("end_time".to_string(), end_time.map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));

    let check_query = r#"
        MATCH (s:Session {id: $session_id})-[:HAS_BURST_EMOTION_DATA]->(b:BurstEmotionData)
        WHERE b.record_id = $record_id 
          AND b.begin_time = $begin_time 
          AND b.end_time = $end_time
        RETURN b.id as existingId
        LIMIT 1
    "#;

    let existing = txn.execute(check_query, check_params).await?;
    if !existing.is_empty() {
        return Ok(());
    }

    // Extract emotion scores and vocal types
    let mut emotion_scores = HashMap::new();
    let mut vocal_types = HashMap::new();

    for key in EMOTION_KEYS {
        if let Some(value_str) = record.get(*key) {
            if let Ok(value) = value_str.parse::<f64>() {
                emotion_scores.insert(key.to_string(), value);
            }
        }
    }

    for key in VOCAL_KEYS {
        if let Some(value_str) = record.get(*key) {
            if let Ok(value) = value_str.parse::<f64>() {
                vocal_types.insert(key.to_string(), value);
            }
        }
    }

    let node_id = format!("burst_{}_{}", chrono::Utc::now().timestamp_millis(), uuid::Uuid::new_v4());
    
    let mut create_params = HashMap::new();
    create_params.insert("session_id".to_string(), neo4rs::types::BoltType::String(session_id.as_str().to_string()));
    create_params.insert("node_id".to_string(), neo4rs::types::BoltType::String(node_id));
    create_params.insert("participant_id".to_string(), neo4rs::types::BoltType::String(participant_id.to_string()));
    create_params.insert("record_id".to_string(), neo4rs::types::BoltType::String(record_id));
    create_params.insert("begin_time".to_string(), begin_time.map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));
    create_params.insert("end_time".to_string(), end_time.map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));
    create_params.insert("emotion_scores".to_string(), neo4rs::types::BoltType::String(serde_json::to_string(&emotion_scores)?));
    create_params.insert("vocal_types".to_string(), neo4rs::types::BoltType::String(serde_json::to_string(&vocal_types)?));

    let create_query = r#"
        MATCH (s:Session {id: $session_id})
        CREATE (b:BurstEmotionData {
            id: $node_id,
            participant_id: $participant_id,
            session_id: $session_id,
            record_id: $record_id,
            begin_time: $begin_time,
            end_time: $end_time,
            emotion_scores: $emotion_scores,
            vocal_types: $vocal_types,
            created_at: datetime()
        })
        CREATE (s)-[:HAS_BURST_EMOTION_DATA]->(b)
    "#;

    txn.execute(create_query, create_params).await?;
    Ok(())
}

async fn store_face_emotion_data(
    txn: &mut crate::neo4j::client::Transaction,
    session_id: &ValidatedSessionId,
    participant_id: &str,
    record: &HashMap<String, String>,
) -> Result<(), ImportError> {
    let record_id = record.get("Id").unwrap_or(&"unknown".to_string()).clone();
    let frame = record.get("Frame").and_then(|s| s.parse::<i32>().ok());
    let time = record.get("Time").and_then(|s| s.parse::<f64>().ok());

    // Check for duplicates
    let mut check_params = HashMap::new();
    check_params.insert("session_id".to_string(), neo4rs::types::BoltType::String(session_id.as_str().to_string()));
    check_params.insert("record_id".to_string(), neo4rs::types::BoltType::String(record_id.clone()));
    check_params.insert("frame".to_string(), frame.map(neo4rs::types::BoltType::Integer).unwrap_or(neo4rs::types::BoltType::Null));
    check_params.insert("time".to_string(), time.map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));

    let check_query = r#"
        MATCH (s:Session {id: $session_id})-[:HAS_FACE_EMOTION_DATA]->(f:FaceEmotionData)
        WHERE f.record_id = $record_id 
          AND f.frame = $frame 
          AND f.time = $time
        RETURN f.id as existingId
        LIMIT 1
    "#;

    let existing = txn.execute(check_query, check_params).await?;
    if !existing.is_empty() {
        return Ok(());
    }

    // Extract emotion scores and AU scores
    let mut emotion_scores = HashMap::new();
    let mut au_scores = HashMap::new();

    for key in EMOTION_KEYS {
        if let Some(value_str) = record.get(*key) {
            if let Ok(value) = value_str.parse::<f64>() {
                emotion_scores.insert(key.to_string(), value);
            }
        }
    }

    for key in AU_KEYS {
        if let Some(value_str) = record.get(*key) {
            if let Ok(value) = value_str.parse::<f64>() {
                au_scores.insert(key.to_string(), value);
            }
        }
    }

    let node_id = format!("face_{}_{}", chrono::Utc::now().timestamp_millis(), uuid::Uuid::new_v4());
    
    let mut create_params = HashMap::new();
    create_params.insert("session_id".to_string(), neo4rs::types::BoltType::String(session_id.as_str().to_string()));
    create_params.insert("node_id".to_string(), neo4rs::types::BoltType::String(node_id));
    create_params.insert("participant_id".to_string(), neo4rs::types::BoltType::String(participant_id.to_string()));
    create_params.insert("record_id".to_string(), neo4rs::types::BoltType::String(record_id));
    create_params.insert("frame".to_string(), frame.map(neo4rs::types::BoltType::Integer).unwrap_or(neo4rs::types::BoltType::Null));
    create_params.insert("time".to_string(), time.map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));
    create_params.insert("probability".to_string(), record.get("Probability").and_then(|s| s.parse::<f64>().ok()).map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));
    create_params.insert("face_x0".to_string(), record.get("FaceX0").and_then(|s| s.parse::<f64>().ok()).map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));
    create_params.insert("face_y0".to_string(), record.get("FaceY0").and_then(|s| s.parse::<f64>().ok()).map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));
    create_params.insert("face_width".to_string(), record.get("FaceWidth").and_then(|s| s.parse::<f64>().ok()).map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));
    create_params.insert("face_height".to_string(), record.get("FaceHeight").and_then(|s| s.parse::<f64>().ok()).map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));
    create_params.insert("emotion_scores".to_string(), neo4rs::types::BoltType::String(serde_json::to_string(&emotion_scores)?));
    create_params.insert("au_scores".to_string(), neo4rs::types::BoltType::String(serde_json::to_string(&au_scores)?));

    let create_query = r#"
        MATCH (s:Session {id: $session_id})
        CREATE (f:FaceEmotionData {
            id: $node_id,
            participant_id: $participant_id,
            session_id: $session_id,
            record_id: $record_id,
            frame: $frame,
            time: $time,
            probability: $probability,
            face_x0: $face_x0,
            face_y0: $face_y0,
            face_width: $face_width,
            face_height: $face_height,
            emotion_scores: $emotion_scores,
            au_scores: $au_scores,
            created_at: datetime()
        })
        CREATE (s)-[:HAS_FACE_EMOTION_DATA]->(f)
    "#;

    txn.execute(create_query, create_params).await?;
    Ok(())
}

async fn store_language_emotion_data(
    txn: &mut crate::neo4j::client::Transaction,
    session_id: &ValidatedSessionId,
    participant_id: &str,
    record: &HashMap<String, String>,
) -> Result<(), ImportError> {
    let record_id = record.get("Id").unwrap_or(&"unknown".to_string()).clone();
    let text = record.get("Text").cloned();
    let begin_time = record.get("BeginTime").and_then(|s| s.parse::<f64>().ok());
    let end_time = record.get("EndTime").and_then(|s| s.parse::<f64>().ok());

    // Check for duplicates
    let mut check_params = HashMap::new();
    check_params.insert("session_id".to_string(), neo4rs::types::BoltType::String(session_id.as_str().to_string()));
    check_params.insert("record_id".to_string(), neo4rs::types::BoltType::String(record_id.clone()));
    check_params.insert("text".to_string(), text.as_ref().map(|t| neo4rs::types::BoltType::String(t.clone())).unwrap_or(neo4rs::types::BoltType::Null));
    check_params.insert("begin_time".to_string(), begin_time.map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));
    check_params.insert("end_time".to_string(), end_time.map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));

    let check_query = r#"
        MATCH (s:Session {id: $session_id})-[:HAS_LANGUAGE_EMOTION_DATA]->(l:LanguageEmotionData)
        WHERE l.record_id = $record_id 
          AND l.text = $text 
          AND l.begin_time = $begin_time 
          AND l.end_time = $end_time
        RETURN l.id as existingId
        LIMIT 1
    "#;

    let existing = txn.execute(check_query, check_params).await?;
    if !existing.is_empty() {
        return Ok(());
    }

    // Extract emotion scores and toxicity scores
    let mut emotion_scores = HashMap::new();
    let mut toxicity_scores = HashMap::new();

    for key in EMOTION_KEYS {
        if let Some(value_str) = record.get(*key) {
            if let Ok(value) = value_str.parse::<f64>() {
                emotion_scores.insert(key.to_string(), value);
            }
        }
    }

    // Extract toxicity scores (if present)
    if let Some(toxicity_str) = record.get("Toxicity") {
        if let Ok(toxicity) = toxicity_str.parse::<f64>() {
            toxicity_scores.insert("toxicity".to_string(), toxicity);
        }
    }

    let node_id = format!("language_{}_{}", chrono::Utc::now().timestamp_millis(), uuid::Uuid::new_v4());
    
    let mut create_params = HashMap::new();
    create_params.insert("session_id".to_string(), neo4rs::types::BoltType::String(session_id.as_str().to_string()));
    create_params.insert("node_id".to_string(), neo4rs::types::BoltType::String(node_id));
    create_params.insert("participant_id".to_string(), neo4rs::types::BoltType::String(participant_id.to_string()));
    create_params.insert("record_id".to_string(), neo4rs::types::BoltType::String(record_id));
    create_params.insert("text".to_string(), text.as_ref().map(|t| neo4rs::types::BoltType::String(t.clone())).unwrap_or(neo4rs::types::BoltType::Null));
    create_params.insert("begin_time".to_string(), begin_time.map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));
    create_params.insert("end_time".to_string(), end_time.map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));
    create_params.insert("emotion_scores".to_string(), neo4rs::types::BoltType::String(serde_json::to_string(&emotion_scores)?));
    create_params.insert("toxicity_scores".to_string(), neo4rs::types::BoltType::String(serde_json::to_string(&toxicity_scores)?));

    let create_query = r#"
        MATCH (s:Session {id: $session_id})
        CREATE (l:LanguageEmotionData {
            id: $node_id,
            participant_id: $participant_id,
            session_id: $session_id,
            record_id: $record_id,
            text: $text,
            begin_time: $begin_time,
            end_time: $end_time,
            emotion_scores: $emotion_scores,
            toxicity_scores: $toxicity_scores,
            created_at: datetime()
        })
        CREATE (s)-[:HAS_LANGUAGE_EMOTION_DATA]->(l)
    "#;

    txn.execute(create_query, create_params).await?;
    Ok(())
}

async fn store_prosody_emotion_data(
    txn: &mut crate::neo4j::client::Transaction,
    session_id: &ValidatedSessionId,
    participant_id: &str,
    record: &HashMap<String, String>,
) -> Result<(), ImportError> {
    let record_id = record.get("Id").unwrap_or(&"unknown".to_string()).clone();
    let time = record.get("Time").and_then(|s| s.parse::<f64>().ok());

    // Check for duplicates
    let mut check_params = HashMap::new();
    check_params.insert("session_id".to_string(), neo4rs::types::BoltType::String(session_id.as_str().to_string()));
    check_params.insert("record_id".to_string(), neo4rs::types::BoltType::String(record_id.clone()));
    check_params.insert("time".to_string(), time.map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));

    let check_query = r#"
        MATCH (s:Session {id: $session_id})-[:HAS_PROSODY_EMOTION_DATA]->(pr:ProsodyEmotionData)
        WHERE pr.record_id = $record_id 
          AND pr.time = $time
        RETURN pr.id as existingId
        LIMIT 1
    "#;

    let existing = txn.execute(check_query, check_params).await?;
    if !existing.is_empty() {
        return Ok(());
    }

    // Extract emotion scores
    let mut emotion_scores = HashMap::new();

    for key in EMOTION_KEYS {
        if let Some(value_str) = record.get(*key) {
            if let Ok(value) = value_str.parse::<f64>() {
                emotion_scores.insert(key.to_string(), value);
            }
        }
    }

    let node_id = format!("prosody_{}_{}", chrono::Utc::now().timestamp_millis(), uuid::Uuid::new_v4());
    
    let mut create_params = HashMap::new();
    create_params.insert("session_id".to_string(), neo4rs::types::BoltType::String(session_id.as_str().to_string()));
    create_params.insert("node_id".to_string(), neo4rs::types::BoltType::String(node_id));
    create_params.insert("participant_id".to_string(), neo4rs::types::BoltType::String(participant_id.to_string()));
    create_params.insert("record_id".to_string(), neo4rs::types::BoltType::String(record_id));
    create_params.insert("time".to_string(), time.map(neo4rs::types::BoltType::Float).unwrap_or(neo4rs::types::BoltType::Null));
    create_params.insert("emotion_scores".to_string(), neo4rs::types::BoltType::String(serde_json::to_string(&emotion_scores)?));

    let create_query = r#"
        MATCH (s:Session {id: $session_id})
        CREATE (pr:ProsodyEmotionData {
            id: $node_id,
            participant_id: $participant_id,
            session_id: $session_id,
            record_id: $record_id,
            time: $time,
            emotion_scores: $emotion_scores,
            created_at: datetime()
        })
        CREATE (s)-[:HAS_PROSODY_EMOTION_DATA]->(pr)
    "#;

    txn.execute(create_query, create_params).await?;
    Ok(())
}

