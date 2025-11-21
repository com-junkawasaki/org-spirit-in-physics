// Merkle DAG: import.service.import.timeline
// Timeline points integration import logic using PostgreSQL + SQLx
// Integrates session events, emotions, and physiological data into timeline_points table

use crate::config::Config;
use crate::error::ImportError;
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Postgres, Transaction, Row};
use std::collections::HashMap;
use tracing::{info, warn, error};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportResult {
    pub success: bool,
    pub total_sessions: usize,
    pub processed_sessions: usize,
    pub total_timeline_points: usize,
    pub results: Vec<SessionTimelineResult>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionTimelineResult {
    pub participant_id: String,
    pub session_id: String,
    pub status: String,
    pub message: String,
    pub timeline_points_count: usize,
}

pub async fn import_timeline_points(
    pool: &PgPool,
    config: &Config,
) -> Result<ImportResult, ImportError> {
    info!("Starting timeline points import...");

    // Get all sessions from database
    let sessions = sqlx::query_as::<_, (Uuid, Uuid, i32, i64, Option<i64>)>(
        r#"
        SELECT id, participant_id, session_index, start_ts, end_ts
        FROM sessions
        ORDER BY participant_id, session_index
        "#
    )
    .fetch_all(pool)
    .await?;

    info!("Found {} sessions to process", sessions.len());

    let mut results = Vec::new();
    let mut total_timeline_points = 0;

    for (session_id, participant_id, session_index, start_ts, end_ts) in sessions {
        let mut txn = pool.begin().await?;
        
        match process_session_timeline(
            &mut txn,
            &participant_id,
            &session_id,
            session_index,
            start_ts,
            end_ts,
            config,
        ).await {
            Ok(result) => {
                txn.commit().await?;
                total_timeline_points += result.timeline_points_count;
                results.push(result);
            }
            Err(e) => {
                txn.rollback().await?;
                error!("Error importing timeline for session {}: {}", session_id, e);
                results.push(SessionTimelineResult {
                    participant_id: participant_id.to_string(),
                    session_id: session_id.to_string(),
                    status: "error".to_string(),
                    message: e.to_string(),
                    timeline_points_count: 0,
                });
            }
        }
    }

    Ok(ImportResult {
        success: true,
        total_sessions: sessions.len(),
        processed_sessions: results.len(),
        total_timeline_points,
        results,
    })
}

async fn process_session_timeline(
    txn: &mut Transaction<'_, Postgres>,
    participant_id: &Uuid,
    session_id: &Uuid,
    _session_index: i32,
    start_ts: i64,
    _end_ts: Option<i64>,
    _config: &Config,
) -> Result<SessionTimelineResult, ImportError> {
    info!("Processing timeline for session {} (participant: {})", session_id, participant_id);

    // Delete existing timeline points for this session
    sqlx::query("DELETE FROM timeline_points WHERE session_id = $1")
        .bind(session_id)
        .execute(&mut **txn)
        .await?;

    // Get session events from sessions table
    let events_json: serde_json::Value = sqlx::query_scalar(
        "SELECT events FROM sessions WHERE id = $1"
    )
    .bind(session_id)
    .fetch_optional(&mut **txn)
    .await?
    .unwrap_or_else(|| serde_json::json!([]));

    let events = events_json.as_array()
        .ok_or_else(|| ImportError::Validation("Invalid events format".to_string()))?;

    // Filter word_displayed events
    let word_events: Vec<_> = events.iter()
        .filter(|e| {
            e.get("type")
                .and_then(|t| t.as_str())
                .map(|t| t == "word_displayed")
                .unwrap_or(false)
        })
        .collect();

    info!("Found {} word_displayed events", word_events.len());

    // Get emotion data from database
    let emotion_data = get_emotion_data_for_session(txn, session_id, participant_id).await?;
    info!("Found {} emotion entries", emotion_data.len());

    // Get physiological data from database
    let physiological_data = get_physiological_data_for_session(txn, session_id, participant_id).await?;
    info!("Found {} physiological entries", physiological_data.len());

    // Integrate data and create timeline points
    let mut timeline_points_count = 0;

    for (idx, event) in word_events.iter().enumerate() {
        let timestamp = event.get("timestamp")
            .and_then(|t| t.as_i64())
            .ok_or_else(|| ImportError::Validation("Missing timestamp".to_string()))?;

        let word = event.get("payload")
            .and_then(|p| p.get("word"))
            .and_then(|w| w.as_str())
            .unwrap_or("Unknown")
            .to_string();

        // Calculate reaction time (find next speech_detected or response_window_closed event)
        let reaction_time = calculate_reaction_time(events, timestamp, idx);

        // Find related emotions (within ±60 seconds)
        let relative_timestamp_sec = (timestamp - start_ts) / 1000;
        let related_emotions = find_related_emotions(&emotion_data, relative_timestamp_sec);

        // Find related physiological data (within ±5 seconds)
        let related_physiological = find_related_physiological(&physiological_data, timestamp);

        // Build emotions array
        let emotions_json: serde_json::Value = related_emotions.iter()
            .flat_map(|e| {
                e.emotion_scores.iter().map(|(name, score)| {
                    serde_json::json!({
                        "name": name,
                        "score": *score,
                        "file_type": e.file_type
                    })
                }).collect::<Vec<_>>()
            })
            .collect();

        // Build physiological object
        let physiological_json = if !related_physiological.is_empty() {
            let all_values: Vec<f64> = related_physiological.iter()
                .flat_map(|p| p.channels.values().copied())
                .collect();

            let average = if !all_values.is_empty() {
                all_values.iter().sum::<f64>() / all_values.len() as f64
            } else {
                0.0
            };

            let max = all_values.iter().copied().fold(0.0, f64::max);
            let min = all_values.iter().copied().fold(0.0, f64::min);

            serde_json::json!({
                "average": average,
                "max": max,
                "min": min,
                "channels": related_physiological.iter()
                    .flat_map(|p| p.channels.iter())
                    .fold(HashMap::new(), |mut acc, (k, v)| {
                        let entry = acc.entry(k.clone()).or_insert_with(Vec::new);
                        entry.push(*v);
                        acc
                    })
                    .into_iter()
                    .map(|(k, v)| {
                        let avg = v.iter().sum::<f64>() / v.len() as f64;
                        (k, avg)
                    })
                    .collect::<HashMap<_, _>>()
            })
        } else {
            serde_json::json!({
                "average": 0.0,
                "max": 0.0,
                "min": 0.0,
                "channels": {}
            })
        };

        // Calculate reaction value (sum of emotion scores + physiological average)
        let emotion_total: f64 = related_emotions.iter()
            .flat_map(|e| e.emotion_scores.values())
            .sum();

        let physiological_average = physiological_json.get("average")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);

        let reaction_value = emotion_total + physiological_average;

        // Build metadata
        let metadata_json = serde_json::json!({
            "emotionCount": related_emotions.len(),
            "physiologicalCount": related_physiological.len()
        });

        // Convert timestamp to DateTime<Utc>
        let time = DateTime::<Utc>::from_timestamp(timestamp / 1000, ((timestamp % 1000) * 1_000_000) as u32)
            .unwrap_or_else(|| Utc::now());

        // Insert timeline point
        sqlx::query(
            r#"
            INSERT INTO timeline_points (
                time, participant_id, session_id, word, event_type,
                reaction_value, reaction_time, has_response,
                emotions, physiological, metadata, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            "#
        )
        .bind(time)
        .bind(participant_id)
        .bind(session_id)
        .bind(&word)
        .bind("word_displayed")
        .bind(reaction_value)
        .bind(reaction_time.map(|rt| rt as f64 / 1000.0))
        .bind(reaction_time.is_some())
        .bind(&emotions_json)
        .bind(&physiological_json)
        .bind(&metadata_json)
        .execute(&mut **txn)
        .await?;

        timeline_points_count += 1;
    }

    info!("Created {} timeline points for session {}", timeline_points_count, session_id);

    Ok(SessionTimelineResult {
        participant_id: participant_id.to_string(),
        session_id: session_id.to_string(),
        status: "success".to_string(),
        message: format!("Created {} timeline points", timeline_points_count),
        timeline_points_count,
    })
}

fn calculate_reaction_time(events: &[serde_json::Value], timestamp: i64, event_index: usize) -> Option<i64> {
    // Find next speech_detected or response_window_closed event
    for i in (event_index + 1)..events.len() {
        if let Some(event) = events.get(i) {
            let event_type = event.get("type").and_then(|t| t.as_str());
            let event_timestamp = event.get("timestamp").and_then(|t| t.as_i64());

            if let (Some("speech_detected"), Some(ts)) = (event_type, event_timestamp) {
                if ts > timestamp {
                    return Some(ts - timestamp);
                }
            } else if let (Some("response_window_closed"), Some(ts)) = (event_type, event_timestamp) {
                if ts > timestamp {
                    return Some(ts - timestamp);
                }
            }
        }
    }
    None
}

#[derive(Debug)]
struct EmotionEntry {
    begin_time: Option<f64>,
    end_time: Option<f64>,
    emotion_scores: HashMap<String, f64>,
    file_type: String,
}

async fn get_emotion_data_for_session(
    txn: &mut Transaction<'_, Postgres>,
    session_id: &Uuid,
    participant_id: &Uuid,
) -> Result<Vec<EmotionEntry>, ImportError> {
    let mut emotion_entries = Vec::new();

    // Get burst emotion data
    let burst_rows = sqlx::query(
        r#"
        SELECT begin_time, end_time, emotion_scores
        FROM burst_emotion_data
        WHERE session_id = $1
        ORDER BY begin_time ASC NULLS LAST
        "#
    )
    .bind(session_id)
    .fetch_all(&mut **txn)
    .await?;

    for row in burst_rows {
        let begin_time: Option<f64> = row.try_get("begin_time")?;
        let end_time: Option<f64> = row.try_get("end_time")?;
        let emotion_scores_json: serde_json::Value = row.try_get("emotion_scores")?;
        let emotion_scores: HashMap<String, f64> = serde_json::from_value(emotion_scores_json)
            .unwrap_or_default();

        emotion_entries.push(EmotionEntry {
            begin_time,
            end_time,
            emotion_scores,
            file_type: "burst".to_string(),
        });
    }

    // Get face emotion data (face_emotion_data doesn't have end_time)
    let face_rows = sqlx::query(
        r#"
        SELECT begin_time, emotion_scores
        FROM face_emotion_data
        WHERE session_id = $1
        ORDER BY begin_time ASC NULLS LAST
        "#
    )
    .bind(session_id)
    .fetch_all(&mut **txn)
    .await?;

    for row in face_rows {
        let begin_time: Option<f64> = row.try_get("begin_time")?;
        let emotion_scores_json: serde_json::Value = row.try_get("emotion_scores")?;
        let emotion_scores: HashMap<String, f64> = serde_json::from_value(emotion_scores_json)
            .unwrap_or_default();

        emotion_entries.push(EmotionEntry {
            begin_time,
            end_time: begin_time.map(|bt| bt + 1.0), // Estimate end_time as begin_time + 1 second
            emotion_scores,
            file_type: "face".to_string(),
        });
    }

    // Get language emotion data
    let language_rows = sqlx::query(
        r#"
        SELECT begin_time, end_time, emotion_scores
        FROM language_emotion_data
        WHERE session_id = $1
        ORDER BY begin_time ASC NULLS LAST
        "#
    )
    .bind(session_id)
    .fetch_all(&mut **txn)
    .await?;

    for row in language_rows {
        let begin_time: Option<f64> = row.try_get("begin_time")?;
        let end_time: Option<f64> = row.try_get("end_time")?;
        let emotion_scores_json: serde_json::Value = row.try_get("emotion_scores")?;
        let emotion_scores: HashMap<String, f64> = serde_json::from_value(emotion_scores_json)
            .unwrap_or_default();

        emotion_entries.push(EmotionEntry {
            begin_time,
            end_time,
            emotion_scores,
            file_type: "language".to_string(),
        });
    }

    // Get prosody emotion data
    let prosody_rows = sqlx::query(
        r#"
        SELECT begin_time, emotion_scores
        FROM prosody_emotion_data
        WHERE session_id = $1
        ORDER BY begin_time ASC NULLS LAST
        "#
    )
    .bind(session_id)
    .fetch_all(&mut **txn)
    .await?;

    for row in prosody_rows {
        let begin_time: Option<f64> = row.try_get("begin_time")?;
        let emotion_scores_json: serde_json::Value = row.try_get("emotion_scores")?;
        let emotion_scores: HashMap<String, f64> = serde_json::from_value(emotion_scores_json)
            .unwrap_or_default();

        emotion_entries.push(EmotionEntry {
            begin_time,
            end_time: None,
            emotion_scores,
            file_type: "prosody".to_string(),
        });
    }

    Ok(emotion_entries)
}

#[derive(Debug)]
struct PhysiologicalEntry {
    timestamp: i64,
    channels: HashMap<String, f64>,
}

async fn get_physiological_data_for_session(
    txn: &mut Transaction<'_, Postgres>,
    session_id: &Uuid,
    participant_id: &Uuid,
) -> Result<Vec<PhysiologicalEntry>, ImportError> {
    // Check if physiological_data table exists
    let table_exists: bool = sqlx::query_scalar(
        r#"
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'physiological_data'
        )
        "#
    )
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(false);

    if !table_exists {
        warn!("physiological_data table does not exist, skipping physiological data");
        return Ok(Vec::new());
    }

    // Try to get physiological data (structure may vary)
    // First, try with channels JSONB column
    let rows_result = sqlx::query(
        r#"
        SELECT time, channels
        FROM physiological_data
        WHERE session_id = $1
        ORDER BY time ASC
        "#
    )
    .bind(session_id)
    .fetch_all(&mut **txn)
    .await;

    match rows_result {
        Ok(rows) => {
            let mut entries = Vec::new();
            for row in rows {
                let time: DateTime<Utc> = row.try_get("time")?;
                let channels_json: serde_json::Value = row.try_get("channels").unwrap_or_else(|_| serde_json::json!({}));
                let channels: HashMap<String, f64> = serde_json::from_value(channels_json)
                    .unwrap_or_default();

                entries.push(PhysiologicalEntry {
                    timestamp: time.timestamp_millis(),
                    channels,
                });
            }
            Ok(entries)
        }
        Err(_) => {
            // If channels column doesn't exist, try with individual channel columns (ch1-ch8)
            let rows = sqlx::query(
                r#"
                SELECT time, ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8
                FROM physiological_data
                WHERE session_id = $1
                ORDER BY time ASC
                "#
            )
            .bind(session_id)
            .fetch_all(&mut **txn)
            .await?;

            let mut entries = Vec::new();
            for row in rows {
                let time: DateTime<Utc> = row.try_get("time")?;
                let mut channels = HashMap::new();
                
                if let Ok(ch1) = row.try_get::<Option<f64>, _>("ch1") {
                    if let Some(v) = ch1 { channels.insert("Ch1".to_string(), v); }
                }
                if let Ok(ch2) = row.try_get::<Option<f64>, _>("ch2") {
                    if let Some(v) = ch2 { channels.insert("Ch2".to_string(), v); }
                }
                if let Ok(ch3) = row.try_get::<Option<f64>, _>("ch3") {
                    if let Some(v) = ch3 { channels.insert("Ch3".to_string(), v); }
                }
                if let Ok(ch4) = row.try_get::<Option<f64>, _>("ch4") {
                    if let Some(v) = ch4 { channels.insert("Ch4".to_string(), v); }
                }
                if let Ok(ch5) = row.try_get::<Option<f64>, _>("ch5") {
                    if let Some(v) = ch5 { channels.insert("Ch5".to_string(), v); }
                }
                if let Ok(ch6) = row.try_get::<Option<f64>, _>("ch6") {
                    if let Some(v) = ch6 { channels.insert("Ch6".to_string(), v); }
                }
                if let Ok(ch7) = row.try_get::<Option<f64>, _>("ch7") {
                    if let Some(v) = ch7 { channels.insert("Ch7".to_string(), v); }
                }
                if let Ok(ch8) = row.try_get::<Option<f64>, _>("ch8") {
                    if let Some(v) = ch8 { channels.insert("Ch8".to_string(), v); }
                }

                entries.push(PhysiologicalEntry {
                    timestamp: time.timestamp_millis(),
                    channels,
                });
            }
            Ok(entries)
        }
    }
}

fn find_related_emotions(emotion_data: &[EmotionEntry], relative_timestamp_sec: i64) -> Vec<&EmotionEntry> {
    let search_start_sec = (relative_timestamp_sec - 60).max(0);
    let search_end_sec = relative_timestamp_sec + 60;

    emotion_data.iter()
        .filter(|e| {
            if let Some(begin_time) = e.begin_time {
                let end_time = e.end_time.unwrap_or(begin_time + 1.0);
                // Check if emotion time range overlaps with search window
                (begin_time <= search_end_sec as f64 && end_time >= search_start_sec as f64) ||
                // Or if within ±60 seconds
                (begin_time - relative_timestamp_sec as f64).abs() <= 60.0
            } else {
                // If begin_time is None, include it (burst/face data without time)
                true
            }
        })
        .collect()
}

fn find_related_physiological(physiological_data: &[PhysiologicalEntry], timestamp: i64) -> Vec<&PhysiologicalEntry> {
    physiological_data.iter()
        .filter(|p| (p.timestamp - timestamp).abs() <= 5000) // Within ±5 seconds
        .collect()
}

