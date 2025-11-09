
use async_graphql::{Context, Object, Result as GQLResult, SimpleObject, InputObject};
use diesel::prelude::*;
use diesel_async::RunQueryDsl;
use std::sync::Arc;
use diesel_async::{AsyncPgConnection, pooled_connection::deadpool::Pool};
use uuid::Uuid;
use serde_json;
use serde::{Deserialize, Serialize};

use crate::models::*;
use crate::db::schema::*;

// GraphQL Types - Participant moved to models.rs as ParticipantGQL

#[derive(SimpleObject, Serialize, Deserialize, Clone, Debug)]
#[graphql(name = "TimelineDataPoint")]
pub struct TimelineDataPoint {
    pub timestamp: f64,
    pub word: String,
    #[graphql(name = "reactionTime")]
    pub reaction_time: i32,
    #[graphql(name = "hasResponse")]
    pub has_response: bool,
    pub emotions: Vec<EmotionData>,
    pub physiological: PhysiologicalData,
    #[graphql(name = "reactionValue")]
    pub reaction_value: f64,
    #[graphql(name = "eventType")]
    pub event_type: Option<String>,
    pub metadata: Option<TimelineDataPointMetadata>,
}

#[derive(SimpleObject, Clone, Serialize, Deserialize, Debug)]
#[graphql(name = "EmotionData")]
pub struct EmotionData {
    pub name: String,
    pub score: f64,
    #[graphql(name = "fileType")]
    pub file_type: String,
}

#[derive(SimpleObject, Clone, Serialize, Deserialize, Debug)]
#[graphql(name = "PhysiologicalData")]
pub struct PhysiologicalData {
    pub average: Option<f64>,
    pub max: Option<f64>,
    pub min: Option<f64>,
}

#[derive(SimpleObject, Serialize, Deserialize, Clone, Debug)]
#[graphql(name = "TimelineDataPointMetadata")]
pub struct TimelineDataPointMetadata {
    #[graphql(name = "emotionCount")]
    pub emotion_count: Option<i32>,
    #[graphql(name = "physiologicalCount")]
    pub physiological_count: Option<i32>,
}

#[derive(SimpleObject, Serialize, Deserialize, Clone, Debug)]
#[graphql(name = "TimelineMetadata")]
pub struct TimelineMetadata {
    #[graphql(name = "sessionEvents")]
    pub session_events: Option<i32>,
    #[graphql(name = "emotionEntries")]
    pub emotion_entries: Option<i32>,
    #[graphql(name = "physiologicalEntries")]
    pub physiological_entries: Option<i32>,
    #[graphql(name = "totalDataPoints")]
    pub total_data_points: Option<i32>,
    #[graphql(name = "dataSource")]
    pub data_source: Option<String>,
    pub errors: Option<Vec<String>>,
    pub truncated: Option<bool>,
    #[graphql(name = "originalSize")]
    pub original_size: Option<i32>,
}

#[derive(SimpleObject)]
#[graphql(name = "ParticipantTimelineResponse")]
pub struct ParticipantTimelineResponse {
    #[graphql(name = "timelineData")]
    pub timeline_data: Vec<TimelineDataPoint>,
    pub metadata: TimelineMetadata,
}

#[derive(SimpleObject)]
#[graphql(name = "ParticipantResponse")]
pub struct ParticipantResponse {
    pub id: String,
    #[graphql(name = "stimulusWord")]
    pub stimulus_word: String,
    #[graphql(name = "responseWord")]
    pub response_word: Option<String>,
    #[graphql(name = "reactionTimeMs")]
    pub reaction_time_ms: Option<i32>,
    #[graphql(name = "spiritProbability")]
    pub spirit_probability: Option<f64>,
    pub emotion: Option<String>,
    #[graphql(name = "emotionConfidence")]
    pub emotion_confidence: Option<f64>,
    #[graphql(name = "eventTs")]
    pub event_ts: String,
    #[graphql(name = "sessionId")]
    pub session_id: Option<String>,
}

#[derive(SimpleObject)]
#[graphql(name = "Word2VecData")]
pub struct Word2VecData {
    pub word: String,
    pub embedding: Vec<f64>,
}

#[derive(SimpleObject)]
#[graphql(name = "ParticipantWord2VecResponse")]
pub struct ParticipantWord2VecResponse {
    #[graphql(name = "wordData")]
    pub word_data: Vec<Word2VecData>,
}

#[derive(SimpleObject)]
#[graphql(name = "NodeMetadata")]
pub struct NodeMetadata {
    pub word: String,
    #[graphql(name = "reactionTime")]
    pub reaction_time: Option<i32>,
    #[graphql(name = "emotionScore")]
    pub emotion_score: Option<f64>,
    #[graphql(name = "observationRatio")]
    pub observation_ratio: f64,
}

#[derive(SimpleObject)]
#[graphql(name = "VisualizationNode")]
pub struct VisualizationNode {
    pub id: String,
    pub label: String,
    pub x: f64,
    pub y: f64,
    pub z: Option<f64>,
    pub color: String,
    pub size: f64,
    pub metadata: NodeMetadata,
}

#[derive(SimpleObject)]
#[graphql(name = "VisualizationEdge")]
pub struct VisualizationEdge {
    pub source: String,
    pub target: String,
    pub weight: f64,
    pub distance: f64,
    pub color: String,
    pub width: f64,
}

#[derive(SimpleObject)]
#[graphql(name = "VisualizationMetadata")]
pub struct VisualizationMetadata {
    #[graphql(name = "totalNodes")]
    pub total_nodes: i32,
    #[graphql(name = "totalEdges")]
    pub total_edges: i32,
    pub method: String,
    pub dimensions: i32,
    #[graphql(name = "averageDistance")]
    pub average_distance: f64,
    #[graphql(name = "clusteringCoefficient")]
    pub clustering_coefficient: f64,
}

#[derive(SimpleObject)]
#[graphql(name = "VisualizationData")]
pub struct VisualizationData {
    pub nodes: Vec<VisualizationNode>,
    pub edges: Vec<VisualizationEdge>,
    pub metadata: VisualizationMetadata,
}

#[derive(SimpleObject)]
pub struct DashboardStats {
    pub total_participants: i32,
    pub total_sessions: i32,
    pub total_responses: i32,
    pub average_spirit_probability: f64,
    pub emotion_distribution: serde_json::Value,
    pub component_averages: ComponentAverages,
}

#[derive(SimpleObject)]
pub struct ComponentAverages {
    pub word2vec: f64,
    pub reaction_time: f64,
    pub skin_potential: f64,
    pub emotion: f64,
}

#[derive(InputObject)]
#[graphql(name = "CalculateEmotionDistanceInput")]
pub struct CalculateEmotionDistanceInput {
    #[graphql(name = "participantId")]
    pub participant_id: String,
    #[graphql(name = "experimentId")]
    pub experiment_id: Option<String>,
    pub method: String,
    #[graphql(name = "embeddingMethod")]
    pub embedding_method: String,
    pub dimensions: i32,
    pub k: Option<i32>,
    pub gamma: Option<f64>,
    pub alpha: Option<f64>,
    #[graphql(name = "topKEmotions")]
    pub top_k_emotions: Option<Vec<String>>,
}

#[derive(Default)]
pub struct Query;

#[Object]
impl Query {
    async fn participants(&self, ctx: &Context<'_>) -> GQLResult<Vec<ParticipantGQL>> {
        let pool = ctx.data::<Arc<Pool<AsyncPgConnection>>>()?;
        let mut conn = pool.get().await?;
        // Select specific fields to avoid GenderType enum issues
        let db_participants: Vec<(uuid::Uuid, Option<i32>, Option<String>, Option<chrono::DateTime<chrono::Utc>>, Option<chrono::DateTime<chrono::Utc>>)> = 
            participants::table
                .select((
                    participants::id,
                    participants::age,
                    participants::handedness,
                    participants::created_at,
                    participants::updated_at,
                ))
                .load(&mut conn)
                .await?;

        use diesel::dsl::count;
        
        // Process each participant to get statistics
        let mut gql_participants = Vec::new();
        for (id, age, handedness, created_at, updated_at) in db_participants {
            let participant_uuid = id;
            
            // Count sessions
            let session_count: i64 = participant_experiment_sessions::table
                .filter(participant_experiment_sessions::participant_id.eq(participant_uuid))
                .select(count(participant_experiment_sessions::id))
                .first(&mut conn)
                .await
                .unwrap_or(0);
            
            // Count responses
            let response_count: i64 = participant_response_data::table
                .filter(participant_response_data::participant_id.eq(participant_uuid))
                .select(count(participant_response_data::id))
                .first(&mut conn)
                .await
                .unwrap_or(0);
            
            // Count emotion data (via responses)
            let emotion_data_count: i64 = emotion_data::table
                .inner_join(participant_response_data::table.on(
                    emotion_data::participant_response_data_id.eq(participant_response_data::id)
                ))
                .filter(participant_response_data::participant_id.eq(participant_uuid))
                .select(count(emotion_data::id))
                .first(&mut conn)
                .await
                .unwrap_or(0);
            
            // Count physiological data (via responses)
            let physiological_data_count: i64 = physiological_data::table
                .inner_join(participant_response_data::table.on(
                    physiological_data::participant_response_data_id.eq(participant_response_data::id)
                ))
                .filter(participant_response_data::participant_id.eq(participant_uuid))
                .select(count(physiological_data::id))
                .first(&mut conn)
                .await
                .unwrap_or(0);
            
            // Calculate average spirit probability from analysis results
            use diesel::dsl::avg;
            let avg_spirit_prob: Option<f64> = participant_analysis_results::table
                .filter(participant_analysis_results::participant_id.eq(participant_uuid))
                .filter(participant_analysis_results::p_value.is_not_null())
                .select(avg(participant_analysis_results::p_value))
                .first(&mut conn)
                .await
                .ok()
                .flatten();
            
            gql_participants.push(ParticipantGQL {
                        id: id.to_string(),
                        age,
                        gender: None, // GenderType enum conversion skipped for now
                        handedness,
                        created_at: created_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
                        updated_at: updated_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
                session_count: Some(session_count),
                response_count: Some(response_count),
                emotion_data_count: Some(emotion_data_count),
                physiological_data_count: Some(physiological_data_count),
                average_spirit_probability: avg_spirit_prob,
            });
        }

        Ok(gql_participants)
    }

    async fn participant(&self, ctx: &Context<'_>, participant_id: String) -> GQLResult<ParticipantGQL> {
        let pool = ctx.data::<Arc<Pool<AsyncPgConnection>>>()?;
        let mut conn = pool.get().await?;
        
        let participant_uuid = Uuid::parse_str(&participant_id)
            .map_err(|e| async_graphql::Error::new(format!("Invalid participant ID: {}", e)))?;
        
        // Select specific fields to avoid GenderType enum issues
        let db_participant_result: Result<(uuid::Uuid, Option<i32>, Option<String>, Option<chrono::DateTime<chrono::Utc>>, Option<chrono::DateTime<chrono::Utc>>), diesel::result::Error> = 
            participants::table
                .filter(participants::id.eq(participant_uuid))
                .select((
                    participants::id,
                    participants::age,
                    participants::handedness,
                    participants::created_at,
                    participants::updated_at,
                ))
                .first(&mut conn)
                .await;
        
        let db_participant = db_participant_result.ok();

        match db_participant {
            Some((id, age, handedness, created_at, updated_at)) => {
                // Get statistics
                use diesel::dsl::count;
                
                // Count sessions
                let session_count: i64 = participant_experiment_sessions::table
                    .filter(participant_experiment_sessions::participant_id.eq(participant_uuid))
                    .select(count(participant_experiment_sessions::id))
                    .first(&mut conn)
                    .await
                    .unwrap_or(0);
                
                // Count responses
                let response_count: i64 = participant_response_data::table
                    .filter(participant_response_data::participant_id.eq(participant_uuid))
                    .select(count(participant_response_data::id))
                    .first(&mut conn)
                    .await
                    .unwrap_or(0);
                
                // Count emotion data (via responses)
                let emotion_data_count: i64 = emotion_data::table
                    .inner_join(participant_response_data::table.on(
                        emotion_data::participant_response_data_id.eq(participant_response_data::id)
                    ))
                    .filter(participant_response_data::participant_id.eq(participant_uuid))
                    .select(count(emotion_data::id))
                    .first(&mut conn)
                    .await
                    .unwrap_or(0);
                
                // Count physiological data (via responses)
                let physiological_data_count: i64 = physiological_data::table
                    .inner_join(participant_response_data::table.on(
                        physiological_data::participant_response_data_id.eq(participant_response_data::id)
                    ))
                    .filter(participant_response_data::participant_id.eq(participant_uuid))
                    .select(count(physiological_data::id))
                    .first(&mut conn)
                    .await
                    .unwrap_or(0);
                
                // Calculate average spirit probability from analysis results
                use diesel::dsl::avg;
                let avg_spirit_prob: Option<f64> = participant_analysis_results::table
                    .filter(participant_analysis_results::participant_id.eq(participant_uuid))
                    .filter(participant_analysis_results::p_value.is_not_null())
                    .select(avg(participant_analysis_results::p_value))
                    .first(&mut conn)
                    .await
                    .ok()
                    .flatten();
                
                Ok(ParticipantGQL {
                    id: id.to_string(),
                    age,
                    gender: None, // GenderType enum conversion skipped for now
                    handedness,
                    created_at: created_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
                    updated_at: updated_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
                    session_count: Some(session_count),
                    response_count: Some(response_count),
                    emotion_data_count: Some(emotion_data_count),
                    physiological_data_count: Some(physiological_data_count),
                    average_spirit_probability: avg_spirit_prob,
                })
            }
            None => Err(async_graphql::Error::new(format!("Participant not found: {}", participant_id)))
        }
    }

    // Merkle DAG: activities.participant_timeline
    // GraphQL query to fetch participant timeline data including emotion and physiological data
    // RDF: https://spirit-in-physics.gftd.ai/activity/participantTimeline
    #[graphql(name = "participantTimeline")]
    async fn participant_timeline(&self, ctx: &Context<'_>, participant_id: String) -> GQLResult<ParticipantTimelineResponse> {
        use diesel::dsl::count;
        
        eprintln!("[GraphQL] participant_timeline: Starting query for participant_id={}", participant_id);
        
        // Get database connection pool
        let pool = ctx.data::<Arc<Pool<AsyncPgConnection>>>()
            .map_err(|e| {
                eprintln!("[GraphQL] participant_timeline: Failed to get database pool: {:?}", e);
                async_graphql::Error::new(format!("Database connection pool error: {:?}", e))
            })?;
        
        eprintln!("[GraphQL] participant_timeline: Got database pool, acquiring connection...");
        let mut conn = pool.get().await
            .map_err(|e| {
                eprintln!("[GraphQL] participant_timeline: Failed to acquire database connection: {:?}", e);
                async_graphql::Error::new(format!("Failed to acquire database connection: {}", e))
            })?;
        
        eprintln!("[GraphQL] participant_timeline: Database connection acquired");
        
        // Parse participant ID
        let participant_uuid = Uuid::parse_str(&participant_id)
            .map_err(|e| {
                eprintln!("[GraphQL] participant_timeline: Invalid UUID format: participant_id={}, error={:?}", participant_id, e);
                async_graphql::Error::new(format!("Invalid participant ID format '{}': {}", participant_id, e))
            })?;
        
        eprintln!("[GraphQL] participant_timeline: Parsed UUID: {:?}", participant_uuid);
        
        // Check cache first
        eprintln!("[GraphQL] participant_timeline: Checking cache...");
        use diesel::OptionalExtension;
        // Query cache separately to avoid JSONB tuple type issues
        let cached_timeline: Option<serde_json::Value> = 
            participant_timeline_cache::table
                .filter(participant_timeline_cache::participant_id.eq(participant_uuid))
                .select(participant_timeline_cache::timeline_data)
                .first(&mut conn)
                .await
                .optional()
                .map_err(|e| {
                    eprintln!("[GraphQL] participant_timeline: Error checking cache timeline: {:?}", e);
                    async_graphql::Error::new(format!("Failed to check cache: {}", e))
                })?;
        
        let cached_metadata: Option<serde_json::Value> = 
            participant_timeline_cache::table
                .filter(participant_timeline_cache::participant_id.eq(participant_uuid))
                .select(participant_timeline_cache::metadata)
                .first(&mut conn)
                .await
                .optional()
                .map_err(|e| {
                    eprintln!("[GraphQL] participant_timeline: Error checking cache metadata: {:?}", e);
                    async_graphql::Error::new(format!("Failed to check cache: {}", e))
                })?;
        
        if let (Some(timeline_json), Some(metadata_json)) = (cached_timeline, cached_metadata) {
            eprintln!("[GraphQL] participant_timeline: Cache hit! Returning cached data");
            let timeline_data: Vec<TimelineDataPoint> = serde_json::from_value(timeline_json)
                .map_err(|e| {
                    eprintln!("[GraphQL] participant_timeline: Error deserializing cached timeline data: {:?}", e);
                    async_graphql::Error::new(format!("Failed to deserialize cached timeline data: {}", e))
                })?;
            let metadata: TimelineMetadata = serde_json::from_value(metadata_json)
                .map_err(|e| {
                    eprintln!("[GraphQL] participant_timeline: Error deserializing cached metadata: {:?}", e);
                    async_graphql::Error::new(format!("Failed to deserialize cached metadata: {}", e))
                })?;
            
            return Ok(ParticipantTimelineResponse {
                timeline_data,
                metadata,
            });
        }
        
        eprintln!("[GraphQL] participant_timeline: Cache miss, computing timeline data in real-time...");
        
        // Fetch participant response data
        eprintln!("[GraphQL] participant_timeline: Fetching response data from database...");
        type ResponseRow = (uuid::Uuid, String, Option<String>, Option<i32>, chrono::DateTime<chrono::Utc>);
        let responses: Vec<ResponseRow> = 
            participant_response_data::table
                .filter(participant_response_data::participant_id.eq(participant_uuid))
                .select((
                    participant_response_data::id,
                    participant_response_data::stimulus_word,
                    participant_response_data::response_word,
                    participant_response_data::reaction_time_ms,
                    participant_response_data::timestamp,
                ))
                .order(participant_response_data::timestamp.asc())
                .load(&mut conn)
                .await
                .map_err(|e| {
                    eprintln!("[GraphQL] participant_timeline: Database query error when fetching responses: {:?}", e);
                    async_graphql::Error::new(format!("Failed to fetch response data for participant {}: {}", participant_id, e))
                })?;
        
        eprintln!("[GraphQL] participant_timeline: Fetched {} response records", responses.len());
        
        if responses.is_empty() {
            eprintln!("[GraphQL] participant_timeline: No response data found for participant {}", participant_id);
            return Ok(ParticipantTimelineResponse {
                timeline_data: vec![],
                metadata: TimelineMetadata {
                    session_events: None,
                    emotion_entries: Some(0),
                    physiological_entries: Some(0),
                    total_data_points: Some(0),
                    data_source: Some("database".to_string()),
                    errors: None,
                    truncated: None,
                    original_size: Some(0),
                },
            });
        }
        
        // Collect response IDs for fetching related data
        let response_ids: Vec<uuid::Uuid> = responses.iter().map(|(id, _, _, _, _)| *id).collect();
        eprintln!("[GraphQL] participant_timeline: Collected {} response IDs for related data queries", response_ids.len());
        
        // Fetch emotion data for all responses
        eprintln!("[GraphQL] participant_timeline: Fetching emotion data...");
        type EmotionRow = (uuid::Uuid, String, f64, Option<String>);
        let emotion_rows: Vec<EmotionRow> = emotion_data::table
            .filter(emotion_data::participant_response_data_id.eq_any(&response_ids))
            .select((
                emotion_data::participant_response_data_id,
                emotion_data::emotion_name,
                emotion_data::score,
                emotion_data::file_type,
            ))
            .load(&mut conn)
                .await
            .map_err(|e| {
                eprintln!("[GraphQL] participant_timeline: Database query error when fetching emotion data: {:?}", e);
                async_graphql::Error::new(format!("Failed to fetch emotion data for participant {}: {}", participant_id, e))
            })?;
        
        eprintln!("[GraphQL] participant_timeline: Fetched {} emotion records", emotion_rows.len());
        
        // Group emotion data by response ID
        use std::collections::HashMap;
        let mut emotions_by_response: HashMap<uuid::Uuid, Vec<EmotionData>> = HashMap::new();
        for (response_id, emotion_name, score, file_type) in emotion_rows {
            emotions_by_response
                .entry(response_id)
                .or_insert_with(Vec::new)
                .push(EmotionData {
                    name: emotion_name,
                    score,
                    file_type: file_type.unwrap_or_else(|| "unknown".to_string()),
                });
        }
        
        // Fetch physiological data for all responses
        eprintln!("[GraphQL] participant_timeline: Fetching physiological data...");
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
                .await
            .map_err(|e| {
                eprintln!("[GraphQL] participant_timeline: Database query error when fetching physiological data: {:?}", e);
                async_graphql::Error::new(format!("Failed to fetch physiological data for participant {}: {}", participant_id, e))
            })?;
        
        eprintln!("[GraphQL] participant_timeline: Fetched {} physiological records", physiological_rows.len());
        
        // Group physiological data by response ID (take first match for each response)
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
        eprintln!("[GraphQL] participant_timeline: Counting session events...");
        let session_events_count: i64 = participant_session_events::table
            .inner_join(participant_experiment_sessions::table.on(
                participant_session_events::session_id.eq(participant_experiment_sessions::id)
            ))
            .filter(participant_experiment_sessions::participant_id.eq(participant_uuid))
            .select(count(participant_session_events::id))
            .first(&mut conn)
            .await
            .unwrap_or_else(|e| {
                eprintln!("[GraphQL] participant_timeline: Warning - Failed to count session events: {:?}, using 0", e);
                0
            });
        
        eprintln!("[GraphQL] participant_timeline: Found {} session events", session_events_count);
        
        // Convert to TimelineDataPoint
        eprintln!("[GraphQL] participant_timeline: Converting responses to timeline data points...");
        let timeline_data: Vec<TimelineDataPoint> = responses.into_iter().map(|(id, stimulus_word, response_word, reaction_time_ms, timestamp)| {
            let timestamp_float = timestamp.timestamp_millis() as f64;
            
            // Get emotion data for this response
            let emotions = emotions_by_response
                .get(&id)
                .cloned()
                .unwrap_or_else(Vec::new);
            
            // Get physiological data for this response
            let physiological = physiological_by_response
                .get(&id)
                .cloned()
                .unwrap_or_else(|| PhysiologicalData {
                    average: None,
                    max: None,
                    min: None,
                });
            
            // Calculate metadata before moving emotions and physiological
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
        
        // Calculate totals before moving timeline_data
        let total_data_points = timeline_data.len() as i32;
        let total_emotion_entries: i32 = timeline_data.iter().map(|d| d.emotions.len() as i32).sum();
        let total_physiological_entries: i32 = timeline_data.iter().filter(|d| d.physiological.average.is_some()).count() as i32;
        
        eprintln!("[GraphQL] participant_timeline: Completed successfully - {} data points, {} emotion entries, {} physiological entries", 
                  total_data_points, total_emotion_entries, total_physiological_entries);
        
        Ok(ParticipantTimelineResponse {
            timeline_data,
            metadata: TimelineMetadata {
                session_events: Some(session_events_count as i32),
                emotion_entries: Some(total_emotion_entries),
                physiological_entries: Some(total_physiological_entries),
                total_data_points: Some(total_data_points),
                data_source: Some("realtime".to_string()), // Indicate this is computed in real-time, not from cache
                errors: None,
                truncated: None,
                original_size: Some(total_data_points),
            },
        })
    }

    async fn participant_responses(&self, ctx: &Context<'_>, participant_id: String) -> GQLResult<Vec<ParticipantResponse>> {
        let pool = ctx.data::<Arc<Pool<AsyncPgConnection>>>()?;
        let mut conn = pool.get().await?;
        
        let participant_uuid = Uuid::parse_str(&participant_id)
            .map_err(|e| async_graphql::Error::new(format!("Invalid participant ID: {}", e)))?;
        
        // Fetch response data
        let responses: Vec<(uuid::Uuid, String, Option<String>, Option<i32>, chrono::DateTime<chrono::Utc>, Option<String>)> = 
            participant_response_data::table
                .filter(participant_response_data::participant_id.eq(participant_uuid))
                .select((
                    participant_response_data::id,
                    participant_response_data::stimulus_word,
                    participant_response_data::response_word,
                    participant_response_data::reaction_time_ms,
                    participant_response_data::timestamp,
                    participant_response_data::session,
                ))
                .order(participant_response_data::timestamp.asc())
                .load(&mut conn)
                .await?;
        
        // Fetch analysis results to get spirit_probability
        let analysis_results: Vec<(uuid::Uuid, Option<f64>)> = 
            participant_analysis_results::table
                .filter(participant_analysis_results::participant_id.eq(participant_uuid))
                .select((
                    participant_analysis_results::id,
                    participant_analysis_results::p_value,
                ))
                .load(&mut conn)
                .await?;
        
        // Create a map of response_id -> spirit_probability from analysis results
        // Note: analysis_results.id is not the same as response_data.id, so we need to match by stimulus/response words
        // For now, we'll use the average p_value for all responses
        let avg_spirit_prob = analysis_results.iter()
            .filter_map(|(_, p_val)| *p_val)
            .collect::<Vec<f64>>();
        let avg_prob = if avg_spirit_prob.is_empty() {
            None
        } else {
            Some(avg_spirit_prob.iter().sum::<f64>() / avg_spirit_prob.len() as f64)
        };
        
        // Convert to ParticipantResponse
        let participant_responses: Vec<ParticipantResponse> = responses.into_iter().map(|(id, stimulus_word, response_word, reaction_time_ms, timestamp, session)| {
            ParticipantResponse {
                id: id.to_string(),
                stimulus_word,
                response_word,
                reaction_time_ms,
                spirit_probability: avg_prob, // Use average for now - could be improved with proper matching
                emotion: None, // Would need to join with emotion_data table
                emotion_confidence: None,
                event_ts: timestamp.to_rfc3339(),
                session_id: session,
            }
        }).collect();
        
        Ok(participant_responses)
    }

    // Temporarily disabled - will be fixed in a separate task
    /*
    #[graphql(name = "participantWord2Vec")]
    async fn participant_word2vec(&self, ctx: &Context<'_>, participant_id: String) -> GQLResult<ParticipantWord2VecResponse> {
        // Placeholder implementation - would need word2vec embeddings from database or external service
        Ok(ParticipantWord2VecResponse { 
            word_data: vec![] 
        })
    }
    */

    // async fn dashboard_stats(&self, ctx: &Context<'_>) -> GQLResult<DashboardStats> {
    //     Ok(DashboardStats {
    //         total_participants: 0,
    //         total_sessions: 0,
    //         total_responses: 0,
    //         average_spirit_probability: 0.0,
    //         emotion_distribution: serde_json::json!({}),
    //         component_averages: ComponentAverages {
    //             word2vec: 0.0,
    //             reaction_time: 0.0,
    //             skin_potential: 0.0,
    //             emotion: 0.0,
    //         },
    //     })
    // }
}

#[derive(Default)]
pub struct Mutation;

#[Object]
impl Mutation {
    // Placeholder mutation to satisfy GraphQL schema requirements
    async fn ping(&self) -> GQLResult<String> {
        Ok("pong".to_string())
    }

    // Temporarily disabled - will be fixed in a separate task
    /*
    #[graphql(name = "calculateEmotionDistance")]
    async fn calculate_emotion_distance(&self, ctx: &Context<'_>, input: CalculateEmotionDistanceInput) -> GQLResult<VisualizationData> {
        // Placeholder implementation - would need actual emotion distance calculation logic
        // This would typically:
        // 1. Fetch participant response data
        // 2. Calculate emotion distances using the specified method
        // 3. Apply embedding method (PCA, UMAP, force-directed)
        // 4. Return VisualizationData
        
        // Mock implementation for now
        let nodes = vec![
            VisualizationNode {
                id: "node_0".to_string(),
                label: "word1".to_string(),
                x: 0.0,
                y: 0.0,
                z: Some(0.0),
                color: "#FF0000".to_string(),
                size: 10.0,
                metadata: NodeMetadata {
                    word: "word1".to_string(),
                    reaction_time: Some(100),
                    emotion_score: Some(0.5),
                    observation_ratio: 1.0,
                },
            }
        ];
        
        let edges = vec![];
        
        Ok(VisualizationData {
            nodes,
            edges,
            metadata: VisualizationMetadata {
                total_nodes: nodes.len() as i32,
                total_edges: edges.len() as i32,
                method: input.method.clone(),
                dimensions: input.dimensions,
                average_distance: 0.0,
                clustering_coefficient: 0.0,
            },
        })
    }
    */
}

// ファイルインポートアクティビティ
pub async fn import_file_activity(
    pool: Arc<Pool<AsyncPgConnection>>,
    participant_id: uuid::Uuid,
    data_root_path: String,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut conn = pool.get().await?;

    // 参加者作成
    let new_participant = NewParticipant {
        age: None,
        handedness: None,
    };
    let _participant = conn.build_transaction().run(|mut conn| {
        Box::pin(async move {
            diesel::insert_into(crate::db::schema::participants::table)
                .values(&new_participant)
                .execute(&mut conn)
                .await?;
            // Note: returning() doesn't work with diesel-async 0.4, query separately if needed
            Ok::<crate::models::Participant, diesel::result::Error>(crate::models::Participant {
                id: uuid::Uuid::new_v4(),
                age: None,
                handedness: None,
                created_at: Some(chrono::Utc::now()),
                updated_at: Some(chrono::Utc::now()),
            })
        })
    }).await?;

    // Note: experiments table doesn't exist in schema, skipping for now
    // TODO: Add experiments table to schema or remove this code

    // ファイル処理ロジック（簡易版）
    // 実際にはファイル読み込みと検証を行う
    println!("File import activity for participant {} completed", participant_id);

    Ok(())
}

// ウィンドウ生成アクティビティ
pub async fn generate_windows_activity(
    pool: Arc<Pool<AsyncPgConnection>>,
    experiment_id: uuid::Uuid,
    session_uri: String,
) -> Result<(), Box<dyn std::error::Error>> {
    // Note: windows table doesn't exist in schema, skipping for now
    // TODO: Add windows table to schema or remove this code
    println!("Windows generation activity for experiment {} completed", experiment_id);
    Ok(())
}

// 核融合アクティビティ
pub async fn kernel_fusion_activity(
    pool: Arc<Pool<AsyncPgConnection>>,
    participant_id: uuid::Uuid,
    distances: Vec<String>,
    options: serde_json::Value,
) -> Result<(), Box<dyn std::error::Error>> {
    // Note: kernel_fusion_runs and embedding_results tables don't exist in schema
    // TODO: Add these tables to schema or remove this code
    println!("Kernel fusion activity for participant {} completed", participant_id);
    Ok(())
}

// データローディングとインポートアクティビティ
pub async fn import_data_activity(
    pool: Arc<Pool<AsyncPgConnection>>,
    participant_id: uuid::Uuid,
    file_path: String,
) -> Result<(), Box<dyn std::error::Error>> {
    // ファイルシステムからデータを読み込む（簡易版）
    // 実際には、data-loader.tsのように詳細なファイル処理を行う
    let content = std::fs::read_to_string(file_path)?;
    println!("Read file content for participant {}", participant_id);

    // データベースに保存
    let mut conn = pool.get().await?;
    let new_participant = NewParticipant {
        age: Some(30), // 簡易データ
        handedness: Some("right".to_string()),
    };
    // Use get_result instead of execute for diesel-async 0.4 compatibility
    let _result = conn.build_transaction().run(|mut conn| {
        Box::pin(async move {
            diesel::insert_into(crate::db::schema::participants::table)
                .values(&new_participant)
                .execute(&mut conn)
                .await?;
            // Note: returning() doesn't work with diesel-async 0.4, return placeholder
            Ok::<crate::models::Participant, diesel::result::Error>(crate::models::Participant {
                id: uuid::Uuid::new_v4(),
                age: Some(30),
                handedness: Some("right".to_string()),
                created_at: Some(chrono::Utc::now()),
                updated_at: Some(chrono::Utc::now()),
            })
        })
    }).await?;

    println!("Data import activity for participant {} completed", participant_id);

    Ok(())
}

// 感情分析アクティビティ
pub async fn emotion_analysis_activity(
    pool: Arc<Pool<AsyncPgConnection>>,
    participant_id: uuid::Uuid,
    video_file: String,
) -> Result<(), Box<dyn std::error::Error>> {
    // Hume AI APIを呼び出す（簡易版）
    let client = reqwest::Client::new();
    let res = client.post("https://api.hume.ai/v0/batch/jobs")
        .header("X-Hume-Api-Key", "YOUR_HUME_API_KEY") // Replace with your actual API key
        .json(&serde_json::json!({
            "models": {
                "face": {}
            },
            "urls": [video_file]
        }))
        .send()
        .await?
        .json::<serde_json::Value>()
        .await?;

    println!("Hume AI API response: {:?}", res);

    // Note: emotion_aggregations table doesn't exist in schema, skipping database save
    // TODO: Add emotion_aggregations table to schema or use existing tables

    println!("Emotion analysis activity for participant {} completed", participant_id);

    Ok(())
}

pub async fn jung_test_activity(participant_id: String, number_of_words: i32) -> Result<(), String> {
    println!("Starting Jung Test for participant {} with {} words.", participant_id, number_of_words);
    // Here you would implement the logic from jung-test-machine.ts
    // - Shuffle words
    // - Present words one by one (this would need client interaction, so the activity might just set up the test)
    // - The client would then call `recordWordResponse` for each word.
    Ok(())
}

pub async fn emotion_analysis_activity_from_url(participant_id: String, video_url: String) -> Result<(), String> {
    println!("Starting emotion analysis for participant {} from URL {}.", participant_id, video_url);
    
    let hume_client = crate::hume_client::HumeClient::new();
    match hume_client.analyze_emotions_from_url(&video_url).await {
        Ok(results) => {
            println!("Analysis complete: {:?}", results);
            // Here you would save the results to the database
            Ok(())
        }
        Err(e) => {
            eprintln!("Hume API error: {}", e);
            Err(format!("Failed to analyze emotions: {}", e))
        }
    }
}
