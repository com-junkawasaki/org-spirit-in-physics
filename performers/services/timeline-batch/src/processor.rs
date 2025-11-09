use crate::db::{DbPool, schema::*};
use crate::models::*;
use diesel::prelude::*;
use diesel::OptionalExtension;
use diesel_async::RunQueryDsl;
use diesel::dsl::count;
use std::collections::HashMap;
use uuid::Uuid;
use chrono::Utc;
use tracing::info;
use diesel::ExpressionMethods;
use diesel::QueryDsl;
use anyhow::Result;

const CHUNK_SIZE: usize = 1000; // Process emotion data in chunks

pub async fn process_participant_timeline(
    pool: &DbPool,
    participant_id: Uuid,
    incremental: bool,
) -> Result<()> {
    let mut conn = pool.get().await?;

    // Create batch job record
    let job_metadata = serde_json::json!({
        "incremental": incremental,
        "chunk_size": CHUNK_SIZE,
    });

    // Insert and get the generated ID
    let job_id: Uuid = diesel::insert_into(participant_timeline_batch_jobs::table)
        .values((
            participant_timeline_batch_jobs::participant_id.eq(participant_id),
            participant_timeline_batch_jobs::status.eq("running"),
            participant_timeline_batch_jobs::progress.eq(Some(0)),
            participant_timeline_batch_jobs::started_at.eq(Some(Utc::now())),
            participant_timeline_batch_jobs::metadata.eq(Some(job_metadata)),
        ))
        .returning(participant_timeline_batch_jobs::id)
        .get_result(&mut conn)
        .await?;

    info!("Created batch job {} for participant {}", job_id, participant_id);

    // Update progress: 10% - Starting
    update_job_progress(&mut conn, &job_id, 10, None).await?;

    // Check if incremental update is possible
    let last_timestamp = if incremental {
        get_last_cached_timestamp(&mut conn, participant_id).await?
    } else {
        None
    };

    // Fetch participant response data
    info!("Fetching response data for participant {}", participant_id);
    let mut query = participant_response_data::table
        .filter(participant_response_data::participant_id.eq(participant_id))
        .order(participant_response_data::timestamp.asc())
        .into_boxed();

    if let Some(last_ts) = last_timestamp {
        query = query.filter(participant_response_data::timestamp.gt(last_ts));
        info!("Incremental mode: only processing responses after {}", last_ts);
    }

    type ResponseRow = (uuid::Uuid, String, Option<String>, Option<i32>, chrono::DateTime<chrono::Utc>);
    let responses: Vec<ResponseRow> = query
        .select((
            participant_response_data::id,
            participant_response_data::stimulus_word,
            participant_response_data::response_word,
            participant_response_data::reaction_time_ms,
            participant_response_data::timestamp,
        ))
        .load(&mut conn)
        .await?;

    info!("Fetched {} response records", responses.len());

    if responses.is_empty() {
        info!("No new data to process");
        update_job_progress(&mut conn, &job_id, 100, None).await?;
        update_job_status(&mut conn, &job_id, "completed", None).await?;
        return Ok(());
    }

    // Update progress: 20% - Responses fetched
    update_job_progress(&mut conn, &job_id, 20, None).await?;

    // Collect response IDs
    let response_ids: Vec<uuid::Uuid> = responses.iter().map(|(id, _, _, _, _)| *id).collect();
    let total_responses = response_ids.len();

    // Fetch emotion data in chunks
    info!("Fetching emotion data in chunks of {}", CHUNK_SIZE);
    let mut all_emotion_rows: Vec<(uuid::Uuid, String, f64, Option<String>)> = Vec::new();
    
    for (chunk_idx, chunk) in response_ids.chunks(CHUNK_SIZE).enumerate() {
        let chunk_emotions: Vec<(uuid::Uuid, String, f64, Option<String>)> = emotion_data::table
            .filter(emotion_data::participant_response_data_id.eq_any(chunk))
            .select((
                emotion_data::participant_response_data_id,
                emotion_data::emotion_name,
                emotion_data::score,
                emotion_data::file_type,
            ))
            .load(&mut conn)
            .await?;

        let chunk_len = chunk_emotions.len();
        all_emotion_rows.extend(chunk_emotions);
        
        let progress = 20 + ((chunk_idx + 1) * 40 / ((total_responses + CHUNK_SIZE - 1) / CHUNK_SIZE));
        update_job_progress(&mut conn, &job_id, (progress.min(60)) as i32, None).await?;
        
        info!("Processed emotion chunk {}/{} ({} emotions)", 
              chunk_idx + 1, 
              (total_responses + CHUNK_SIZE - 1) / CHUNK_SIZE,
              chunk_len);
    }

    info!("Fetched {} total emotion records", all_emotion_rows.len());

    // Update progress: 60% - Emotion data fetched
    update_job_progress(&mut conn, &job_id, 60, None).await?;

    // Group emotion data by response ID
    let mut emotions_by_response: HashMap<uuid::Uuid, Vec<EmotionData>> = HashMap::new();
    for (response_id, emotion_name, score, file_type) in all_emotion_rows {
        emotions_by_response
            .entry(response_id)
            .or_insert_with(Vec::new)
            .push(EmotionData {
                name: emotion_name,
                score,
                file_type: file_type.unwrap_or_else(|| "unknown".to_string()),
            });
    }

    // Fetch physiological data
    info!("Fetching physiological data");
    type PhysiologicalRow = (uuid::Uuid, Option<f64>, Option<f64>, Option<f64>);
    let physiological_rows: Vec<PhysiologicalRow> = physiological_data::table
        .filter(physiological_data::participant_response_data_id.eq_any(&response_ids))
        .select((
            physiological_data::participant_response_data_id,
            physiological_data::average,
            physiological_data::max_value,
            physiological_data::min_value,
        ))
        .load(&mut conn)
        .await?;

    info!("Fetched {} physiological records", physiological_rows.len());

    // Update progress: 70% - Physiological data fetched
    update_job_progress(&mut conn, &job_id, 70, None).await?;

    // Group physiological data by response ID
    let mut physiological_by_response: HashMap<uuid::Uuid, PhysiologicalData> = HashMap::new();
    for (response_id, average, max_value, min_value) in physiological_rows {
        if !physiological_by_response.contains_key(&response_id) {
            physiological_by_response.insert(response_id, PhysiologicalData {
                average,
                max: max_value,
                min: min_value,
            });
        }
    }

    // Count session events
    info!("Counting session events");
    let session_events_count: i64 = participant_session_events::table
        .inner_join(participant_experiment_sessions::table.on(
            participant_session_events::session_id.eq(participant_experiment_sessions::id)
        ))
        .filter(participant_experiment_sessions::participant_id.eq(participant_id))
        .select(count(participant_session_events::id))
        .first(&mut conn)
        .await
        .unwrap_or(0);

    // Update progress: 80% - Data processing complete
    update_job_progress(&mut conn, &job_id, 80, None).await?;

    // Convert to TimelineDataPoint
    info!("Converting responses to timeline data points");
    let responses_clone = responses.clone();
    let timeline_data: Vec<TimelineDataPoint> = responses.into_iter().map(|(id, stimulus_word, response_word, reaction_time_ms, timestamp)| {
        let timestamp_float = timestamp.timestamp_millis() as f64;
        
        let emotions = emotions_by_response
            .get(&id)
            .cloned()
            .unwrap_or_else(Vec::new);
        
        let physiological = physiological_by_response
            .get(&id)
            .cloned()
            .unwrap_or_else(|| PhysiologicalData {
                average: None,
                max: None,
                min: None,
            });
        
        let emotion_count = emotions.len() as i32;
        let physiological_count = if physiological.average.is_some() { Some(1) } else { Some(0) };
        
        TimelineDataPoint {
            timestamp: timestamp_float,
            word: stimulus_word.clone(),
            reaction_time: reaction_time_ms.unwrap_or(0),
            has_response: response_word.is_some(),
            emotions,
            physiological,
            reaction_value: if response_word.is_some() { 1.0 } else { 0.0 },
            event_type: Some("word_response".to_string()),
            metadata: Some(TimelineDataPointMetadata {
                emotion_count: Some(emotion_count),
                physiological_count,
            }),
        }
    }).collect();

    // Calculate totals
    let total_data_points = timeline_data.len() as i32;
    let total_emotion_entries: i32 = timeline_data.iter().map(|d| d.emotions.len() as i32).sum();
    let total_physiological_entries: i32 = timeline_data.iter().filter(|d| d.physiological.average.is_some()).count() as i32;

    info!("Generated {} timeline data points ({} emotion entries, {} physiological entries)",
          total_data_points, total_emotion_entries, total_physiological_entries);

    // Update progress: 90% - Timeline data generated
    update_job_progress(&mut conn, &job_id, 90, None).await?;

    // Get or merge with existing cache
    let (final_timeline_data, final_metadata, last_timestamp) = if incremental {
        merge_with_existing_cache(&mut conn, participant_id, timeline_data, total_data_points, total_emotion_entries, total_physiological_entries, session_events_count).await?
    } else {
        let last_ts = responses_clone.last().map(|(_, _, _, _, ts)| *ts);
        let metadata = TimelineMetadata {
            session_events: Some(session_events_count as i32),
            emotion_entries: Some(total_emotion_entries),
            physiological_entries: Some(total_physiological_entries),
            total_data_points: Some(total_data_points),
            data_source: Some("batch".to_string()),
            errors: None,
            truncated: None,
            original_size: Some(total_data_points),
        };
        (timeline_data, metadata, last_ts)
    };

    // Save to cache
    info!("Saving timeline data to cache");
    save_timeline_cache(&mut conn, participant_id, &final_timeline_data, &final_metadata, last_timestamp).await?;

    // Update progress: 100% - Complete
    update_job_progress(&mut conn, &job_id, 100, None).await?;
    update_job_status(&mut conn, &job_id, "completed", None).await?;

    info!("Timeline processing completed successfully for participant {}", participant_id);
    Ok(())
}

async fn get_last_cached_timestamp(
    conn: &mut diesel_async::AsyncPgConnection,
    participant_id: Uuid,
) -> Result<Option<chrono::DateTime<chrono::Utc>>, diesel::result::Error> {
    participant_timeline_cache::table
        .filter(participant_timeline_cache::participant_id.eq(participant_id))
        .select(participant_timeline_cache::last_response_timestamp)
        .first::<Option<chrono::DateTime<chrono::Utc>>>(conn)
        .await
        .optional()
        .map(|r| r.flatten())
}

async fn merge_with_existing_cache(
    conn: &mut diesel_async::AsyncPgConnection,
    participant_id: Uuid,
    new_timeline_data: Vec<TimelineDataPoint>,
    new_total_points: i32,
    new_emotion_entries: i32,
    new_physiological_entries: i32,
    session_events_count: i64,
) -> Result<(Vec<TimelineDataPoint>, TimelineMetadata, Option<chrono::DateTime<chrono::Utc>>)> {
    // Load existing cache
    let existing_cache: Option<(serde_json::Value, serde_json::Value)> = participant_timeline_cache::table
        .filter(participant_timeline_cache::participant_id.eq(participant_id))
        .select((
            participant_timeline_cache::timeline_data,
            participant_timeline_cache::metadata,
        ))
        .first(conn)
        .await
        .optional()?;

    if let Some((existing_timeline_json, existing_metadata_json)) = existing_cache {
        let mut existing_timeline: Vec<TimelineDataPoint> = serde_json::from_value(existing_timeline_json)?;
        let _existing_metadata: TimelineMetadata = serde_json::from_value(existing_metadata_json)?;

        // Merge: append new data (assuming it's chronologically later)
        existing_timeline.extend(new_timeline_data);

        // Sort by timestamp
        existing_timeline.sort_by(|a, b| a.timestamp.partial_cmp(&b.timestamp).unwrap_or(std::cmp::Ordering::Equal));

        // Recalculate totals
        let total_data_points = existing_timeline.len() as i32;
        let total_emotion_entries: i32 = existing_timeline.iter().map(|d| d.emotions.len() as i32).sum();
        let total_physiological_entries: i32 = existing_timeline.iter().filter(|d| d.physiological.average.is_some()).count() as i32;

        let metadata = TimelineMetadata {
            session_events: Some(session_events_count as i32),
            emotion_entries: Some(total_emotion_entries),
            physiological_entries: Some(total_physiological_entries),
            total_data_points: Some(total_data_points),
            data_source: Some("batch_merged".to_string()),
            errors: None,
            truncated: None,
            original_size: Some(total_data_points),
        };

        let last_timestamp = existing_timeline.last().map(|d| {
            chrono::DateTime::from_timestamp((d.timestamp / 1000.0) as i64, 0)
                .unwrap_or_else(|| Utc::now())
        });

        Ok((existing_timeline, metadata, last_timestamp))
    } else {
        // No existing cache, use new data as-is
        let last_timestamp = new_timeline_data.last().map(|d| {
            chrono::DateTime::from_timestamp((d.timestamp / 1000.0) as i64, 0)
                .unwrap_or_else(|| Utc::now())
        });
        let metadata = TimelineMetadata {
            session_events: Some(session_events_count as i32),
            emotion_entries: Some(new_emotion_entries),
            physiological_entries: Some(new_physiological_entries),
            total_data_points: Some(new_total_points),
            data_source: Some("batch".to_string()),
            errors: None,
            truncated: None,
            original_size: Some(new_total_points),
        };
        Ok((new_timeline_data, metadata, last_timestamp))
    }
}

async fn save_timeline_cache(
    conn: &mut diesel_async::AsyncPgConnection,
    participant_id: Uuid,
    timeline_data: &[TimelineDataPoint],
    metadata: &TimelineMetadata,
    last_timestamp: Option<chrono::DateTime<chrono::Utc>>,
) -> Result<()> {
    // Get current data version
    let current_version: i32 = participant_timeline_cache::table
        .filter(participant_timeline_cache::participant_id.eq(participant_id))
        .select(participant_timeline_cache::data_version)
        .first(conn)
        .await
        .optional()?
        .unwrap_or(0);

    let new_version = current_version + 1;

    let timeline_json = serde_json::to_value(timeline_data)?;
    let metadata_json = serde_json::to_value(metadata)?;

    let cache_entry = NewTimelineCache {
        participant_id,
        timeline_data: timeline_json,
        metadata: metadata_json,
        data_version: new_version,
        last_response_timestamp: last_timestamp,
    };

    // Use INSERT ... ON CONFLICT ... DO UPDATE
    diesel::insert_into(participant_timeline_cache::table)
        .values((
            participant_timeline_cache::participant_id.eq(cache_entry.participant_id),
            participant_timeline_cache::timeline_data.eq(&cache_entry.timeline_data),
            participant_timeline_cache::metadata.eq(&cache_entry.metadata),
            participant_timeline_cache::data_version.eq(cache_entry.data_version),
            participant_timeline_cache::last_response_timestamp.eq(&cache_entry.last_response_timestamp),
        ))
        .on_conflict(participant_timeline_cache::participant_id)
        .do_update()
        .set((
            participant_timeline_cache::timeline_data.eq(&cache_entry.timeline_data),
            participant_timeline_cache::metadata.eq(&cache_entry.metadata),
            participant_timeline_cache::data_version.eq(cache_entry.data_version),
            participant_timeline_cache::last_response_timestamp.eq(&cache_entry.last_response_timestamp),
            participant_timeline_cache::computed_at.eq(Utc::now()),
        ))
        .execute(conn)
        .await?;

    info!("Saved timeline cache for participant {} (version {})", participant_id, new_version);
    Ok(())
}

async fn update_job_progress(
    conn: &mut diesel_async::AsyncPgConnection,
    job_id: &Uuid,
    progress: i32,
    error_message: Option<&str>,
) -> Result<(), diesel::result::Error> {
    use diesel::ExpressionMethods;
    
    diesel::update(participant_timeline_batch_jobs::table.filter(participant_timeline_batch_jobs::id.eq(job_id)))
        .set((
            participant_timeline_batch_jobs::progress.eq(Some(progress)),
            participant_timeline_batch_jobs::error_message.eq(error_message),
        ))
        .execute(conn)
        .await?;
    
    Ok(())
}

async fn update_job_status(
    conn: &mut diesel_async::AsyncPgConnection,
    job_id: &Uuid,
    status: &str,
    error_message: Option<&str>,
) -> Result<(), diesel::result::Error> {
    use diesel::ExpressionMethods;
    
    let completed_at = if status == "completed" || status == "failed" {
        Some(Utc::now())
    } else {
        None
    };
    
    diesel::update(participant_timeline_batch_jobs::table.filter(participant_timeline_batch_jobs::id.eq(job_id)))
        .set((
            participant_timeline_batch_jobs::status.eq(status),
            participant_timeline_batch_jobs::completed_at.eq(completed_at),
            participant_timeline_batch_jobs::error_message.eq(error_message),
        ))
        .execute(conn)
        .await?;
    
    Ok(())
}

