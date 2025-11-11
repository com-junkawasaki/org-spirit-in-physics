// Merkle DAG: import.service.import.emotions
// Emotion import logic using PostgreSQL + SQLx

use crate::config::Config;
use crate::error::ImportError;
use crate::utils::{find_hume_artifacts_directory, find_hume_predictions_file, find_all_registry_csv_directories, parse_csv_file};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use sqlx::{PgPool, Postgres, Transaction};
use tokio::fs;
use tracing::{info, warn, error};
use uuid::Uuid;

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
        match process_emotions(&mut txn, &participant_id, &participant_path).await {
            Ok(result) => {
                txn.commit().await?;
                results.push(result);
            }
            Err(e) => {
                txn.rollback().await?;
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
        total: total_count,
        processed: results.len(),
        results,
    })
}

async fn process_emotions(
    txn: &mut Transaction<'_, Postgres>,
    participant_id: &str,
    participant_path: &PathBuf,
) -> Result<EmotionResult, ImportError> {
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

    // Get session ID (first session for participant)
    let session: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM sessions WHERE participant_id = $1 ORDER BY session_index ASC LIMIT 1"
    )
    .bind(participant_uuid)
    .fetch_optional(&mut **txn)
    .await?;

    let session_uuid = match session {
        Some((id,)) => id,
        None => {
            return Err(ImportError::SessionNotFound(format!(
                "No session found for participant {}",
                participant_id
            )));
        }
    };

    // Delete existing emotion data
    delete_existing_emotion_data(&mut **txn, participant_uuid, session_uuid).await?;

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
            store_emotion_entry(&mut **txn, session_uuid, participant_uuid, &entry).await?;
        }
    }

    // Process all CSV directories
    let csv_directories = find_all_registry_csv_directories(&hume_artifacts_dir).await?;
    let mut csv_files_processed = 0;
    let mut burst_count = 0;
    let mut face_count = 0;
    let mut language_count = 0;
    let mut prosody_count = 0;

    info!("Found {} CSV directories for participant {}", csv_directories.len(), participant_id);

    for csv_dir in csv_directories {
        let csv_files = vec!["burst.csv", "face.csv", "language.csv", "prosody.csv"];
        
        for csv_file in csv_files {
            let csv_path = csv_dir.join(csv_file);
            if csv_path.exists() {
                info!("Processing CSV file: {} for participant {}", csv_path.display(), participant_id);
                match process_csv_file(&mut **txn, session_uuid, participant_uuid, &csv_path, csv_file).await {
                    Ok(count) => {
                        csv_files_processed += 1;
                        total_emotions += count;
                        match csv_file {
                            "burst.csv" => burst_count += count,
                            "face.csv" => face_count += count,
                            "language.csv" => language_count += count,
                            "prosody.csv" => prosody_count += count,
                            _ => {}
                        }
                        info!("Successfully processed {} records from {} for participant {}", count, csv_file, participant_id);
                    }
                    Err(e) => {
                        warn!("Error processing CSV file {} for participant {}: {}", csv_path.display(), participant_id, e);
                    }
                }
            } else {
                info!("CSV file not found: {} for participant {}", csv_path.display(), participant_id);
            }
        }
    }

    info!("Emotions imported for participant {}: {} entries, {} CSV files, {} total emotions", 
          participant_id, emotion_entries_count, csv_files_processed, total_emotions);
    
    info!("Participant {} emotion import details: burst={}, face={}, language={}, prosody={}",
          participant_id, burst_count, face_count, language_count, prosody_count);

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
    txn: &mut Transaction<'_, Postgres>,
    participant_uuid: Uuid,
    session_uuid: Uuid,
) -> Result<(), ImportError> {
    // Delete existing emotion data for this session
    sqlx::query("DELETE FROM burst_emotion_data WHERE session_id = $1")
        .bind(session_uuid)
        .execute(txn)
        .await?;

    sqlx::query("DELETE FROM face_emotion_data WHERE session_id = $1")
        .bind(session_uuid)
        .execute(txn)
        .await?;

    sqlx::query("DELETE FROM language_emotion_data WHERE session_id = $1")
        .bind(session_uuid)
        .execute(txn)
        .await?;

    sqlx::query("DELETE FROM prosody_emotion_data WHERE session_id = $1")
        .bind(session_uuid)
        .execute(txn)
        .await?;

    Ok(())
}

fn process_emotion_data(predictions_data: &serde_json::Value) -> Result<(usize, usize), ImportError> {
    let mut entries_processed = 0;
    let mut total_emotions = 0;

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
    txn: &mut Transaction<'_, Postgres>,
    session_uuid: Uuid,
    participant_uuid: Uuid,
    entry: &EmotionEntryData,
) -> Result<(), ImportError> {
    // Convert emotion scores to JSONB
    let emotion_data: serde_json::Value = entry.emotion_scores.iter()
        .map(|(name, score)| (name.clone(), *score))
        .collect();

    // Calculate time from begin_time (convert seconds to timestamp)
    let time = entry.begin_time
        .map(|bt| {
            // begin_time is in seconds, convert to timestamp
            chrono::Utc::now() + chrono::Duration::seconds(bt as i64)
        })
        .unwrap_or_else(|| chrono::Utc::now());

    // Store in appropriate table based on entry type (simplified - store in burst_emotion_data)
    sqlx::query(
        r#"
        INSERT INTO burst_emotion_data (
            time, session_id, participant_id, record_id, begin_time, end_time, emotion_scores, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT DO NOTHING
        "#
    )
    .bind(time)
    .bind(session_uuid)
    .bind(participant_uuid)
    .bind("emotion_entry")
    .bind(entry.begin_time)
    .bind(entry.end_time)
    .bind(&emotion_data)
    .execute(txn)
    .await?;

    Ok(())
}

async fn process_csv_file(
    txn: &mut Transaction<'_, Postgres>,
    session_uuid: Uuid,
    participant_uuid: Uuid,
    csv_path: &PathBuf,
    csv_type: &str,
) -> Result<usize, ImportError> {
    let content = fs::read_to_string(csv_path).await?;
    let records = parse_csv_file(&content)?;

    info!("Processing {} records from {} (type: {})", 
          records.len(), csv_path.display(), csv_type);

    let mut count = 0;
    let mut skipped = 0;
    let mut errors = 0;

    match csv_type {
        "burst.csv" => {
            for record in records {
                match store_burst_emotion_data(txn, session_uuid, participant_uuid, &record).await {
                    Ok(()) => count += 1,
                    Err(ImportError::Validation(_)) => skipped += 1,
                    Err(e) => {
                        errors += 1;
                        warn!("Error storing burst emotion data: {}", e);
                    }
                }
            }
        }
        "face.csv" => {
            for record in records {
                match store_face_emotion_data(txn, session_uuid, participant_uuid, &record).await {
                    Ok(()) => count += 1,
                    Err(ImportError::Validation(_)) => skipped += 1,
                    Err(e) => {
                        errors += 1;
                        warn!("Error storing face emotion data: {}", e);
                    }
                }
            }
        }
        "language.csv" => {
            for record in records {
                match store_language_emotion_data(txn, session_uuid, participant_uuid, &record).await {
                    Ok(()) => count += 1,
                    Err(ImportError::Validation(_)) => skipped += 1,
                    Err(e) => {
                        errors += 1;
                        warn!("Error storing language emotion data: {}", e);
                    }
                }
            }
        }
        "prosody.csv" => {
            for record in records {
                match store_prosody_emotion_data(txn, session_uuid, participant_uuid, &record).await {
                    Ok(()) => count += 1,
                    Err(ImportError::Validation(_)) => skipped += 1,
                    Err(e) => {
                        errors += 1;
                        warn!("Error storing prosody emotion data: {}", e);
                    }
                }
            }
        }
        _ => {
            return Err(ImportError::Validation(format!("Unknown CSV type: {}", csv_type)));
        }
    }

    info!("Processed {} (type: {}): {} stored, {} skipped, {} errors", 
          csv_path.display(), csv_type, count, skipped, errors);

    Ok(count)
}

async fn store_burst_emotion_data(
    txn: &mut Transaction<'_, Postgres>,
    session_uuid: Uuid,
    participant_uuid: Uuid,
    record: &HashMap<String, String>,
) -> Result<(), ImportError> {
    let record_id = record.get("Id").unwrap_or(&"unknown".to_string()).clone();
    let begin_time = record.get("BeginTime").and_then(|s| s.parse::<f64>().ok());
    let end_time = record.get("EndTime").and_then(|s| s.parse::<f64>().ok());

    // Extract emotion scores and vocal types
    let mut emotion_scores = HashMap::new();
    let mut vocal_types = Vec::new();

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
                if value > 0.0 {
                    vocal_types.push(key.to_string());
                }
            }
        }
    }

    // Calculate time from begin_time (convert seconds to timestamp)
    let time = begin_time
        .map(|bt| {
            chrono::Utc::now() + chrono::Duration::seconds(bt as i64)
        })
        .unwrap_or_else(|| chrono::Utc::now());

    // Check for duplicates
    let existing: Option<(Uuid,)> = sqlx::query_as(
        r#"
        SELECT id FROM burst_emotion_data 
        WHERE session_id = $1 AND record_id = $2 AND begin_time = $3 AND end_time = $4
        LIMIT 1
        "#
    )
    .bind(session_uuid)
    .bind(&record_id)
    .bind(begin_time)
    .bind(end_time)
    .fetch_optional(txn)
    .await?;

    if existing.is_some() {
        return Ok(());
    }

    // Insert into burst_emotion_data
    sqlx::query(
        r#"
        INSERT INTO burst_emotion_data (
            time, session_id, participant_id, record_id, begin_time, end_time, 
            emotion_scores, vocal_types, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        "#
    )
    .bind(time)
    .bind(session_uuid)
    .bind(participant_uuid)
    .bind(&record_id)
    .bind(begin_time)
    .bind(end_time)
    .bind(&emotion_scores as &serde_json::Value)
    .bind(&vocal_types as &serde_json::Value)
    .execute(txn)
    .await?;

    Ok(())
}

async fn store_face_emotion_data(
    txn: &mut Transaction<'_, Postgres>,
    session_uuid: Uuid,
    participant_uuid: Uuid,
    record: &HashMap<String, String>,
) -> Result<(), ImportError> {
    let record_id = record.get("Id").unwrap_or(&"unknown".to_string()).clone();
    let frame = record.get("Frame").and_then(|s| s.parse::<i32>().ok());
    let begin_time = record.get("Time").and_then(|s| s.parse::<f64>().ok());

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

    // Calculate time from begin_time
    let time = begin_time
        .map(|bt| {
            chrono::Utc::now() + chrono::Duration::seconds(bt as i64)
        })
        .unwrap_or_else(|| chrono::Utc::now());

    // Check for duplicates
    let existing: Option<(Uuid,)> = sqlx::query_as(
        r#"
        SELECT id FROM face_emotion_data 
        WHERE session_id = $1 AND record_id = $2 AND frame = $3 AND begin_time = $4
        LIMIT 1
        "#
    )
    .bind(session_uuid)
    .bind(&record_id)
    .bind(frame)
    .bind(begin_time)
    .fetch_optional(txn)
    .await?;

    if existing.is_some() {
        return Ok(());
    }

    // Insert into face_emotion_data
    sqlx::query(
        r#"
        INSERT INTO face_emotion_data (
            time, session_id, participant_id, record_id, frame, begin_time,
            emotion_scores, au_scores, probability, face_x0, face_y0, face_width, face_height, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        "#
    )
    .bind(time)
    .bind(session_uuid)
    .bind(participant_uuid)
    .bind(&record_id)
    .bind(frame)
    .bind(begin_time)
    .bind(&emotion_scores as &serde_json::Value)
    .bind(&au_scores as &serde_json::Value)
    .bind(record.get("Probability").and_then(|s| s.parse::<f64>().ok()))
    .bind(record.get("FaceX0").and_then(|s| s.parse::<i32>().ok()))
    .bind(record.get("FaceY0").and_then(|s| s.parse::<i32>().ok()))
    .bind(record.get("FaceWidth").and_then(|s| s.parse::<i32>().ok()))
    .bind(record.get("FaceHeight").and_then(|s| s.parse::<i32>().ok()))
    .execute(txn)
    .await?;

    Ok(())
}

async fn store_language_emotion_data(
    txn: &mut Transaction<'_, Postgres>,
    session_uuid: Uuid,
    participant_uuid: Uuid,
    record: &HashMap<String, String>,
) -> Result<(), ImportError> {
    let record_id = record.get("Id").unwrap_or(&"unknown".to_string()).clone();
    let text = record.get("Text").cloned();
    let begin_time = record.get("BeginTime").and_then(|s| s.parse::<f64>().ok());
    let end_time = record.get("EndTime").and_then(|s| s.parse::<f64>().ok());

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

    if let Some(toxicity_str) = record.get("Toxicity") {
        if let Ok(toxicity) = toxicity_str.parse::<f64>() {
            toxicity_scores.insert("toxicity".to_string(), toxicity);
        }
    }

    // Calculate time from begin_time
    let time = begin_time
        .map(|bt| {
            chrono::Utc::now() + chrono::Duration::seconds(bt as i64)
        })
        .unwrap_or_else(|| chrono::Utc::now());

    // Check for duplicates
    let existing: Option<(Uuid,)> = sqlx::query_as(
        r#"
        SELECT id FROM language_emotion_data 
        WHERE session_id = $1 AND record_id = $2 AND text = $3 AND begin_time = $4 AND end_time = $5
        LIMIT 1
        "#
    )
    .bind(session_uuid)
    .bind(&record_id)
    .bind(&text)
    .bind(begin_time)
    .bind(end_time)
    .fetch_optional(txn)
    .await?;

    if existing.is_some() {
        return Ok(());
    }

    // Insert into language_emotion_data
    sqlx::query(
        r#"
        INSERT INTO language_emotion_data (
            time, session_id, participant_id, record_id, text, begin_time, end_time,
            emotion_scores, toxicity_scores, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        "#
    )
    .bind(time)
    .bind(session_uuid)
    .bind(participant_uuid)
    .bind(&record_id)
    .bind(&text)
    .bind(begin_time)
    .bind(end_time)
    .bind(&emotion_scores as &serde_json::Value)
    .bind(&toxicity_scores as &serde_json::Value)
    .execute(txn)
    .await?;

    Ok(())
}

async fn store_prosody_emotion_data(
    txn: &mut Transaction<'_, Postgres>,
    session_uuid: Uuid,
    participant_uuid: Uuid,
    record: &HashMap<String, String>,
) -> Result<(), ImportError> {
    let record_id = record.get("Id").unwrap_or(&"unknown".to_string()).clone();
    let begin_time = record.get("Time").and_then(|s| s.parse::<f64>().ok());

    // Extract emotion scores
    let mut emotion_scores = HashMap::new();

    for key in EMOTION_KEYS {
        if let Some(value_str) = record.get(*key) {
            if let Ok(value) = value_str.parse::<f64>() {
                emotion_scores.insert(key.to_string(), value);
            }
        }
    }

    // Calculate time from begin_time
    let time = begin_time
        .map(|bt| {
            chrono::Utc::now() + chrono::Duration::seconds(bt as i64)
        })
        .unwrap_or_else(|| chrono::Utc::now());

    // Check for duplicates
    let existing: Option<(Uuid,)> = sqlx::query_as(
        r#"
        SELECT id FROM prosody_emotion_data 
        WHERE session_id = $1 AND record_id = $2 AND begin_time = $3
        LIMIT 1
        "#
    )
    .bind(session_uuid)
    .bind(&record_id)
    .bind(begin_time)
    .fetch_optional(txn)
    .await?;

    if existing.is_some() {
        return Ok(());
    }

    // Insert into prosody_emotion_data
    sqlx::query(
        r#"
        INSERT INTO prosody_emotion_data (
            time, session_id, participant_id, record_id, begin_time, emotion_scores, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        "#
    )
    .bind(time)
    .bind(session_uuid)
    .bind(participant_uuid)
    .bind(&record_id)
    .bind(begin_time)
    .bind(&emotion_scores as &serde_json::Value)
    .execute(txn)
    .await?;

    Ok(())
}
