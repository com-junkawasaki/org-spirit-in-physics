use crate::db::{DbPool, schema::*};
use crate::models::*;
use diesel::prelude::*;
use diesel::OptionalExtension;
use diesel_async::RunQueryDsl;
use diesel::dsl::count;
use std::collections::HashMap;
use uuid::Uuid;
use chrono::{Utc, DateTime, TimeZone};
use tracing::info;
use diesel::ExpressionMethods;
use diesel::QueryDsl;
use anyhow::Result;

const CHUNK_SIZE: usize = 1000; // Process emotion data in chunks
const SAMPLE_SIZE: i32 = 2000; // Default sample size for timeline display

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

    // Update progress: 92% - Starting display data generation
    update_job_progress(&mut conn, &job_id, 92, None).await?;

    // Generate display data: word-second aggregates, word aggregates, sampled timeline, force graph
    info!("Generating display data for participant {}", participant_id);
    generate_display_data(&mut conn, participant_id, &responses_clone, &emotions_by_response, &physiological_by_response).await?;

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

// Generate display data: word-second aggregates, word aggregates, sampled timeline, force graph
async fn generate_display_data(
    conn: &mut diesel_async::AsyncPgConnection,
    participant_id: Uuid,
    responses: &[(uuid::Uuid, String, Option<String>, Option<i32>, chrono::DateTime<chrono::Utc>)],
    emotions_by_response: &HashMap<uuid::Uuid, Vec<EmotionData>>,
    physiological_by_response: &HashMap<uuid::Uuid, PhysiologicalData>,
) -> Result<()> {
    // 1. Generate word-second aggregates
    info!("Generating word-second aggregates");
    generate_word_second_aggregates(conn, participant_id, responses, emotions_by_response, physiological_by_response).await?;
    
    // 2. Generate word aggregates
    info!("Generating word aggregates");
    generate_word_aggregates(conn, participant_id).await?;
    
    // 3. Generate sampled timeline data
    info!("Generating sampled timeline data");
    generate_sampled_timeline(conn, participant_id).await?;
    
    // 4. Generate force graph data
    info!("Generating force graph data");
    generate_force_graph_data(conn, participant_id).await?;
    
    Ok(())
}

// Helper function to calculate statistics
fn calculate_stats(values: &[f64]) -> serde_json::Value {
    if values.is_empty() {
        return serde_json::json!({
            "avg": 0.0,
            "std_dev": 0.0,
            "max": 0.0,
            "min": 0.0,
            "count": 0
        });
    }
    
    let count = values.len() as f64;
    let sum: f64 = values.iter().sum();
    let avg = sum / count;
    
    let variance = values.iter()
        .map(|v| (v - avg).powi(2))
        .sum::<f64>() / count;
    let std_dev = variance.sqrt();
    
    let max = values.iter().fold(f64::NEG_INFINITY, |a, &b| a.max(b));
    let min = values.iter().fold(f64::INFINITY, |a, &b| a.min(b));
    
    serde_json::json!({
        "avg": avg,
        "std_dev": std_dev,
        "max": max,
        "min": min,
        "count": values.len() as i32
    })
}

// Helper function to calculate median
fn calculate_median(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    
    let mut sorted = values.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    
    let mid = sorted.len() / 2;
    if sorted.len() % 2 == 0 {
        (sorted[mid - 1] + sorted[mid]) / 2.0
    } else {
        sorted[mid]
    }
}

// Generate word-second aggregates
async fn generate_word_second_aggregates(
    conn: &mut diesel_async::AsyncPgConnection,
    participant_id: Uuid,
    responses: &[(uuid::Uuid, String, Option<String>, Option<i32>, chrono::DateTime<chrono::Utc>)],
    emotions_by_response: &HashMap<uuid::Uuid, Vec<EmotionData>>,
    physiological_by_response: &HashMap<uuid::Uuid, PhysiologicalData>,
) -> Result<()> {
    use diesel::ExpressionMethods;
    
    // Group responses by (word, second_timestamp)
    let mut grouped: HashMap<(String, DateTime<Utc>), Vec<(uuid::Uuid, Option<i32>, Vec<EmotionData>, PhysiologicalData)>> = HashMap::new();
    
    for (id, word, _, reaction_time, timestamp) in responses {
        // Round timestamp to nearest second
        let second_timestamp = timestamp.date_naive().and_hms_opt(
            timestamp.hour(),
            timestamp.minute(),
            timestamp.second()
        ).unwrap();
        let second_timestamp = Utc.from_utc_datetime(&second_timestamp);
        
        let emotions = emotions_by_response.get(id).cloned().unwrap_or_default();
        let physiological = physiological_by_response.get(id).cloned().unwrap_or_else(|| PhysiologicalData {
            average: None,
            max: None,
            min: None,
        });
        
        grouped.entry((word.clone(), second_timestamp))
            .or_insert_with(Vec::new)
            .push((*id, *reaction_time, emotions, physiological));
    }
    
    // Calculate statistics for each group
    for ((word, second_timestamp), group) in grouped {
        // Reaction time stats
        let reaction_times: Vec<f64> = group.iter()
            .filter_map(|(_, rt, _, _)| rt.map(|rt| rt as f64))
            .collect();
        let reaction_time_stats = calculate_stats(&reaction_times);
        
        // Emotion stats (aggregate by emotion name)
        let mut emotion_stats_map: HashMap<String, Vec<f64>> = HashMap::new();
        for (_, _, emotions, _) in &group {
            for emotion in emotions {
                emotion_stats_map.entry(emotion.name.clone())
                    .or_insert_with(Vec::new)
                    .push(emotion.score);
            }
        }
        let mut emotion_stats = serde_json::Map::new();
        for (emotion_name, scores) in emotion_stats_map {
            emotion_stats.insert(emotion_name, calculate_stats(&scores));
        }
        let emotion_stats = serde_json::Value::Object(emotion_stats);
        
        // Physiological stats
        let physiological_values: Vec<f64> = group.iter()
            .filter_map(|(_, _, _, ph)| ph.average)
            .collect();
        let physiological_stats = calculate_stats(&physiological_values);
        
        // Insert or update
        let new_aggregate = crate::models::NewWordSecondAggregate {
            participant_id,
            stimulus_word: word.clone(),
            second_timestamp,
            reaction_time_stats,
            emotion_stats,
            physiological_stats,
            response_count: group.len() as i32,
        };
        
        diesel::insert_into(participant_word_second_aggregates::table)
            .values((
                participant_word_second_aggregates::participant_id.eq(new_aggregate.participant_id),
                participant_word_second_aggregates::stimulus_word.eq(&new_aggregate.stimulus_word),
                participant_word_second_aggregates::second_timestamp.eq(&new_aggregate.second_timestamp),
                participant_word_second_aggregates::reaction_time_stats.eq(&new_aggregate.reaction_time_stats),
                participant_word_second_aggregates::emotion_stats.eq(&new_aggregate.emotion_stats),
                participant_word_second_aggregates::physiological_stats.eq(&new_aggregate.physiological_stats),
                participant_word_second_aggregates::response_count.eq(new_aggregate.response_count),
            ))
            .on_conflict((
                participant_word_second_aggregates::participant_id,
                participant_word_second_aggregates::stimulus_word,
                participant_word_second_aggregates::second_timestamp,
            ))
            .do_update()
            .set((
                participant_word_second_aggregates::reaction_time_stats.eq(&new_aggregate.reaction_time_stats),
                participant_word_second_aggregates::emotion_stats.eq(&new_aggregate.emotion_stats),
                participant_word_second_aggregates::physiological_stats.eq(&new_aggregate.physiological_stats),
                participant_word_second_aggregates::response_count.eq(new_aggregate.response_count),
            ))
            .execute(conn)
            .await?;
    }
    
    Ok(())
}

// Generate word aggregates from word-second aggregates
async fn generate_word_aggregates(
    conn: &mut diesel_async::AsyncPgConnection,
    participant_id: Uuid,
) -> Result<()> {
    use diesel::ExpressionMethods;
    
    // Get all word-second aggregates for this participant
    let aggregates: Vec<(String, serde_json::Value, serde_json::Value, serde_json::Value, DateTime<Utc>)> = 
        participant_word_second_aggregates::table
            .filter(participant_word_second_aggregates::participant_id.eq(participant_id))
            .select((
                participant_word_second_aggregates::stimulus_word,
                participant_word_second_aggregates::reaction_time_stats,
                participant_word_second_aggregates::emotion_stats,
                participant_word_second_aggregates::physiological_stats,
                participant_word_second_aggregates::second_timestamp,
            ))
            .load(conn)
            .await?;
    
    // Group by word
    let mut word_groups: HashMap<String, Vec<(serde_json::Value, serde_json::Value, serde_json::Value, DateTime<Utc>)>> = HashMap::new();
    for (word, rt_stats, em_stats, ph_stats, ts) in aggregates {
        word_groups.entry(word)
            .or_insert_with(Vec::new)
            .push((rt_stats, em_stats, ph_stats, ts));
    }
    
    // Calculate final statistics for each word
    for (word, group) in word_groups {
        // Aggregate reaction times
        let mut all_reaction_times: Vec<f64> = Vec::new();
        for (rt_stats, _, _, _) in &group {
            if let Some(count) = rt_stats.get("count").and_then(|v| v.as_i64()) {
                if let Some(avg) = rt_stats.get("avg").and_then(|v| v.as_f64()) {
                    for _ in 0..count {
                        all_reaction_times.push(avg);
                    }
                }
            }
        }
        let reaction_time_stats = if !all_reaction_times.is_empty() {
            let mut stats = calculate_stats(&all_reaction_times);
            if let Some(obj) = stats.as_object_mut() {
                obj.insert("median".to_string(), serde_json::Value::Number(
                    serde_json::Number::from_f64(calculate_median(&all_reaction_times)).unwrap()
                ));
            }
            stats
        } else {
            serde_json::json!({"avg": 0.0, "std_dev": 0.0, "max": 0.0, "min": 0.0, "count": 0, "median": 0.0})
        };
        
        // Aggregate emotions
        let mut emotion_aggregates: HashMap<String, Vec<f64>> = HashMap::new();
        for (_, em_stats, _, _) in &group {
            if let Some(obj) = em_stats.as_object() {
                for (emotion_name, stats) in obj {
                    if let Some(avg) = stats.get("avg").and_then(|v| v.as_f64()) {
                        if let Some(count) = stats.get("count").and_then(|v| v.as_i64()) {
                            for _ in 0..count {
                                emotion_aggregates.entry(emotion_name.clone())
                                    .or_insert_with(Vec::new)
                                    .push(avg);
                            }
                        }
                    }
                }
            }
        }
        let mut emotion_stats = serde_json::Map::new();
        for (emotion_name, scores) in emotion_aggregates {
            emotion_stats.insert(emotion_name, calculate_stats(&scores));
        }
        let emotion_stats = serde_json::Value::Object(emotion_stats);
        
        // Aggregate physiological
        let mut all_physiological: Vec<f64> = Vec::new();
        for (_, _, ph_stats, _) in &group {
            if let Some(avg) = ph_stats.get("avg").and_then(|v| v.as_f64()) {
                if let Some(count) = ph_stats.get("count").and_then(|v| v.as_i64()) {
                    for _ in 0..count {
                        all_physiological.push(avg);
                    }
                }
            }
        }
        let physiological_stats = calculate_stats(&all_physiological);
        
        // Calculate first and last occurrence
        let timestamps: Vec<DateTime<Utc>> = group.iter().map(|(_, _, _, ts)| *ts).collect();
        let first_occurrence = timestamps.iter().min().copied();
        let last_occurrence = timestamps.iter().max().copied();
        
        let new_aggregate = crate::models::NewWordAggregate {
            participant_id,
            stimulus_word: word.clone(),
            reaction_time_stats,
            emotion_stats,
            physiological_stats,
            total_responses: group.len() as i32,
            total_seconds: timestamps.len() as i32,
            first_occurrence,
            last_occurrence,
        };
        
        diesel::insert_into(participant_word_aggregates::table)
            .values((
                participant_word_aggregates::participant_id.eq(new_aggregate.participant_id),
                participant_word_aggregates::stimulus_word.eq(&new_aggregate.stimulus_word),
                participant_word_aggregates::reaction_time_stats.eq(&new_aggregate.reaction_time_stats),
                participant_word_aggregates::emotion_stats.eq(&new_aggregate.emotion_stats),
                participant_word_aggregates::physiological_stats.eq(&new_aggregate.physiological_stats),
                participant_word_aggregates::total_responses.eq(new_aggregate.total_responses),
                participant_word_aggregates::total_seconds.eq(new_aggregate.total_seconds),
                participant_word_aggregates::first_occurrence.eq(&new_aggregate.first_occurrence),
                participant_word_aggregates::last_occurrence.eq(&new_aggregate.last_occurrence),
            ))
            .on_conflict((
                participant_word_aggregates::participant_id,
                participant_word_aggregates::stimulus_word,
            ))
            .do_update()
            .set((
                participant_word_aggregates::reaction_time_stats.eq(&new_aggregate.reaction_time_stats),
                participant_word_aggregates::emotion_stats.eq(&new_aggregate.emotion_stats),
                participant_word_aggregates::physiological_stats.eq(&new_aggregate.physiological_stats),
                participant_word_aggregates::total_responses.eq(new_aggregate.total_responses),
                participant_word_aggregates::total_seconds.eq(new_aggregate.total_seconds),
                participant_word_aggregates::first_occurrence.eq(&new_aggregate.first_occurrence),
                participant_word_aggregates::last_occurrence.eq(&new_aggregate.last_occurrence),
            ))
            .execute(conn)
            .await?;
    }
    
    Ok(())
}

// Generate sampled timeline data
async fn generate_sampled_timeline(
    conn: &mut diesel_async::AsyncPgConnection,
    participant_id: Uuid,
) -> Result<()> {
    use diesel::ExpressionMethods;
    
    // Load full timeline data from cache
    let timeline_json: Option<serde_json::Value> = participant_timeline_cache::table
        .filter(participant_timeline_cache::participant_id.eq(participant_id))
        .select(participant_timeline_cache::timeline_data)
        .first(conn)
        .await
        .optional()?;
    
    if let Some(timeline_json) = timeline_json {
        let timeline_data: Vec<TimelineDataPoint> = serde_json::from_value(timeline_json)?;
        
        // Use existing sample_timeline_data function (need to import it or copy logic)
        let sampled = sample_timeline_data(timeline_data, SAMPLE_SIZE);
        let sampled_json = serde_json::to_value(sampled)?;
        
        // Update cache with sampled data
        diesel::update(participant_timeline_cache::table.filter(participant_timeline_cache::participant_id.eq(participant_id)))
            .set(participant_timeline_cache::sampled_timeline_data.eq(&sampled_json))
            .execute(conn)
            .await?;
    }
    
    Ok(())
}

// Sample timeline data (copied from graphql/src/activities/mod.rs)
fn sample_timeline_data(data: Vec<TimelineDataPoint>, sample_size: i32) -> Vec<TimelineDataPoint> {
    use std::collections::{HashMap, HashSet};
    
    if data.len() <= sample_size as usize {
        return data;
    }
    
    let sample_size = sample_size as usize;
    let mut sampled: Vec<TimelineDataPoint> = Vec::with_capacity(sample_size);
    let mut selected_indices: HashSet<usize> = HashSet::new();
    
    // Step 1: Identify important events
    let important_count = (sample_size / 10).max(50);
    
    let mut emotion_variances: Vec<(usize, f64)> = data.iter().enumerate().map(|(idx, point)| {
        let emotion_scores: Vec<f64> = point.emotions.iter().map(|e| e.score).collect();
        let variance = if emotion_scores.len() > 1 {
            let mean = emotion_scores.iter().sum::<f64>() / emotion_scores.len() as f64;
            emotion_scores.iter().map(|&s| (s - mean).powi(2)).sum::<f64>() / emotion_scores.len() as f64
        } else {
            0.0
        };
        (idx, variance)
    }).collect();
    
    emotion_variances.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    for (idx, _) in emotion_variances.iter().take(important_count) {
        selected_indices.insert(*idx);
    }
    
    // Step 2: Equal interval sampling
    let remaining = sample_size.saturating_sub(selected_indices.len());
    if remaining > 0 {
        let step = data.len() / remaining;
        for i in 0..remaining {
            let idx = i * step;
            if !selected_indices.contains(&idx) && idx < data.len() {
                selected_indices.insert(idx);
            }
        }
    }
    
    let mut selected_indices_vec: Vec<usize> = selected_indices.into_iter().collect();
    selected_indices_vec.sort();
    
    for idx in selected_indices_vec {
        sampled.push(data[idx].clone());
    }
    
    sampled
}

// Generate force graph data
async fn generate_force_graph_data(
    conn: &mut diesel_async::AsyncPgConnection,
    participant_id: Uuid,
) -> Result<()> {
    use diesel::ExpressionMethods;
    
    // Load word aggregates
    let word_aggregates: Vec<(String, serde_json::Value, serde_json::Value, serde_json::Value)> = 
        participant_word_aggregates::table
            .filter(participant_word_aggregates::participant_id.eq(participant_id))
            .select((
                participant_word_aggregates::stimulus_word,
                participant_word_aggregates::reaction_time_stats,
                participant_word_aggregates::emotion_stats,
                participant_word_aggregates::physiological_stats,
            ))
            .load(conn)
            .await?;
    
    // Load word_stimuli to get all 100 words with their IDs
    let word_stimuli: Vec<(i32, String)> = word_stimuli::table
        .select((word_stimuli::id, word_stimuli::word))
        .order(word_stimuli::id.asc())
        .load(conn)
        .await?;
    
    // Create a map for quick lookup of word stats
    let mut word_stats_map: HashMap<String, (serde_json::Value, serde_json::Value, serde_json::Value)> = HashMap::new();
    for (word, rt_stats, em_stats, ph_stats) in word_aggregates {
        word_stats_map.insert(word, (rt_stats, em_stats, ph_stats));
    }
    
    // Generate nodes (100 Jung stimulus words)
    let mut nodes: Vec<serde_json::Value> = Vec::new();
    for (word_id, word_japanese) in &word_stimuli {
        let (rt_stats, em_stats, ph_stats) = word_stats_map.get(word_japanese)
            .cloned()
            .unwrap_or_else(|| (
                serde_json::json!({"avg": 0.0, "std_dev": 0.0, "max": 0.0, "min": 0.0, "count": 0}),
                serde_json::json!({}),
                serde_json::json!({"avg": 0.0, "std_dev": 0.0, "max": 0.0, "min": 0.0, "count": 0}),
            ));
        
        // Convert emotion_stats to HashMap<String, Stats>
        let mut emotions_map = serde_json::Map::new();
        if let Some(em_obj) = em_stats.as_object() {
            for (emotion_name, stats) in em_obj {
                emotions_map.insert(emotion_name.clone(), stats.clone());
            }
        }
        
        let node = serde_json::json!({
            "id": format!("{}", word_id),
            "label": word_japanese,
            "reactionTime": rt_stats,
            "emotions": serde_json::Value::Object(emotions_map),
            "physiological": ph_stats,
        });
        nodes.push(node);
    }
    
    // Generate links (correlations between words)
    let mut links: Vec<serde_json::Value> = Vec::new();
    
    // Calculate correlations based on emotion similarity
    for i in 0..word_stimuli.len() {
        for j in (i + 1)..word_stimuli.len() {
            let (word1_id, word1_japanese) = &word_stimuli[i];
            let (word2_id, word2_japanese) = &word_stimuli[j];
            
            if let (Some((_, em1_stats, _)), Some((_, em2_stats, _))) = 
                (word_stats_map.get(word1_japanese), word_stats_map.get(word2_japanese)) {
                
                // Calculate emotion correlation
                let mut correlation = 0.0;
                let mut count = 0;
                
                if let (Some(em1_obj), Some(em2_obj)) = (em1_stats.as_object(), em2_stats.as_object()) {
                    for emotion_name in em1_obj.keys() {
                        if let (Some(avg1), Some(avg2)) = (
                            em1_obj.get(emotion_name).and_then(|v| v.get("avg")).and_then(|v| v.as_f64()),
                            em2_obj.get(emotion_name).and_then(|v| v.get("avg")).and_then(|v| v.as_f64()),
                        ) {
                            correlation += (avg1 - avg2).abs();
                            count += 1;
                        }
                    }
                }
                
                if count > 0 {
                    correlation = 1.0 - (correlation / count as f64); // Normalize to 0-1
                    if correlation > 0.1 { // Only include links with significant correlation
                        links.push(serde_json::json!({
                            "source": format!("{}", word1_id),
                            "target": format!("{}", word2_id),
                            "weight": correlation,
                            "correlationType": "emotion"
                        }));
                    }
                }
            }
        }
    }
    
    // Limit to max 4950 links
    if links.len() > 4950 {
        links.sort_by(|a, b| {
            let weight_a = a.get("weight").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let weight_b = b.get("weight").and_then(|v| v.as_f64()).unwrap_or(0.0);
            weight_b.partial_cmp(&weight_a).unwrap_or(std::cmp::Ordering::Equal)
        });
        links.truncate(4950);
    }
    
    let force_graph_data = serde_json::json!({
        "nodes": nodes,
        "links": links
    });
    
    let force_graph_metadata = serde_json::json!({
        "node_count": nodes.len(),
        "link_count": links.len(),
        "generated_at": Utc::now()
    });
    
    // Update cache
    diesel::update(participant_timeline_cache::table.filter(participant_timeline_cache::participant_id.eq(participant_id)))
        .set((
            participant_timeline_cache::force_graph_data.eq(&force_graph_data),
            participant_timeline_cache::force_graph_metadata.eq(&force_graph_metadata),
        ))
        .execute(conn)
        .await?;
    
    Ok(())
}

