use diesel::prelude::*;
use diesel::pg::types::Jsonb;
use uuid::Uuid;
use anyhow::{Result, Context};
use serde_json::{json, Value as JsonValue};
use std::collections::HashMap;

use crate::db::{DbConnection, schema::{emotion_data, response_emotion_timeseries}};

/// Import emotion data for a response from HumeAI CSV records
pub fn import_emotion_data_from_records(
    conn: &mut DbConnection,
    response_id: Uuid,
    records: &[HashMap<String, String>],
    session_start_timestamp_ms: i64,
    source: &str, // e.g., "hume_face", "hume_prosody", "hume_language", "hume_burst"
) -> Result<()> {
    use crate::parsers::{parse_time_from_record, parse_time_range_from_record};

    let mut emotion_records = Vec::new();
    let mut timeseries_records = Vec::new();

    for record in records {
        // Parse time
        let (begin_time_sec, end_time_sec) = if let Some((begin, end)) = parse_time_range_from_record(record) {
            (begin, end)
        } else if let Some(time) = parse_time_from_record(record) {
            (time, time)
        } else {
            continue; // Skip records without time
        };

        // Convert to milliseconds and calculate offset
        let begin_time_ms = (begin_time_sec * 1000.0) as i64;
        let end_time_ms = (end_time_sec * 1000.0) as i64;
        let offset_ms = (begin_time_ms - session_start_timestamp_ms) as i32;

        // Extract emotion scores
        let mut emotion_map = HashMap::new();
        for (key, value) in record.iter() {
            // Skip non-emotion fields
            if matches!(key.as_str(), "Id" | "id" | "Time" | "time" | "BeginTime" | "beginTime" | 
                              "EndTime" | "endTime" | "Text" | "text" | "Frame" | "frame" |
                              "Confidence" | "confidence" | "SpeakerConfidence" | "speakerConfidence" |
                              "BeginPosition" | "beginPosition" | "EndPosition" | "endPosition" |
                              "Probability" | "probability") {
                continue;
            }

            if let Ok(score) = value.parse::<f64>() {
                if score > 0.0 {
                    emotion_map.insert(key.clone(), score);
                }
            }
        }

        if emotion_map.is_empty() {
            continue;
        }

        // Insert into emotion_data table (one record per emotion)
        for (emotion_name, score) in &emotion_map {
            let emotion_id = Uuid::new_v4();
            let timestamp = chrono::DateTime::from_timestamp_millis(begin_time_ms)
                .ok_or_else(|| anyhow::anyhow!("Invalid timestamp"))?
                .with_timezone(&chrono::Utc);

            emotion_records.push((
                emotion_data::id.eq(emotion_id),
                emotion_data::participant_response_data_id.eq(response_id),
                emotion_data::emotion_name.eq(emotion_name),
                emotion_data::score.eq(*score as f64),
                emotion_data::file_type.eq(Some(source)),
                emotion_data::timestamp.eq(timestamp),
            ));
        }

        // Insert into response_emotion_timeseries table
        let emotion_json: JsonValue = json!(emotion_map);
        timeseries_records.push((
            response_emotion_timeseries::response_id.eq(response_id),
            response_emotion_timeseries::timestamp_offset_ms.eq(offset_ms),
            response_emotion_timeseries::source.eq(Some(source)),
            response_emotion_timeseries::emotion_data.eq(Jsonb(emotion_json)),
        ));
    }

    // Batch insert emotion_data
    for record in emotion_records {
        diesel::insert_into(emotion_data::table)
            .values(record)
            .execute(conn)
            .context("Failed to insert emotion data")?;
    }

    // Batch insert timeseries
    for record in timeseries_records {
        diesel::insert_into(response_emotion_timeseries::table)
            .values(record)
            .execute(conn)
            .context("Failed to insert emotion timeseries")?;
    }

    Ok(())
}

/// Map emotion records to a response based on timestamp
pub fn find_emotion_records_for_response(
    records: &[HashMap<String, String>],
    response_timestamp_ms: i64,
    window_before_ms: i64,
    window_after_ms: i64,
) -> Vec<HashMap<String, String>> {
    use crate::parsers::{parse_time_from_record, parse_time_range_from_record};

    records
        .iter()
        .filter(|record| {
            let record_time_ms = if let Some((begin, _)) = parse_time_range_from_record(record) {
                (begin * 1000.0) as i64
            } else if let Some(time) = parse_time_from_record(record) {
                (time * 1000.0) as i64
            } else {
                return false;
            };

            record_time_ms >= (response_timestamp_ms - window_before_ms)
                && record_time_ms <= (response_timestamp_ms + window_after_ms)
        })
        .cloned()
        .collect()
}

