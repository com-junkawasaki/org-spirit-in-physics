
use async_graphql::{Context, Object, Result as GQLResult, SimpleObject, InputObject};
use diesel::prelude::*;
use diesel_async::RunQueryDsl;
use std::sync::Arc;
use std::time::Instant;
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

#[derive(SimpleObject, Serialize, Deserialize, Clone, Debug)]
#[graphql(name = "ForceGraphStats")]
pub struct ForceGraphStats {
    pub avg: f64,
    #[graphql(name = "stdDev")]
    pub std_dev: f64,
    pub max: f64,
    pub min: f64,
    pub count: i32,
}

#[derive(SimpleObject, Serialize, Deserialize, Clone, Debug)]
#[graphql(name = "ForceGraphNode")]
pub struct ForceGraphNode {
    pub id: String,
    pub label: String,
    #[graphql(name = "reactionTime")]
    pub reaction_time: ForceGraphStats,
    pub emotions: std::collections::HashMap<String, ForceGraphStats>,
    pub physiological: ForceGraphStats,
}

#[derive(SimpleObject, Serialize, Deserialize, Clone, Debug)]
#[graphql(name = "ForceGraphLink")]
pub struct ForceGraphLink {
    pub source: String,
    pub target: String,
    pub weight: f64,
    #[graphql(name = "correlationType")]
    pub correlation_type: String,
}

#[derive(SimpleObject, Serialize, Deserialize, Clone, Debug)]
#[graphql(name = "ForceGraphData")]
pub struct ForceGraphData {
    pub nodes: Vec<ForceGraphNode>,
    pub links: Vec<ForceGraphLink>,
}

#[derive(SimpleObject, Serialize, Deserialize, Clone, Debug)]
#[graphql(name = "ForceGraphMetadata")]
pub struct ForceGraphMetadata {
    #[graphql(name = "nodeCount")]
    pub node_count: i32,
    #[graphql(name = "linkCount")]
    pub link_count: i32,
    #[graphql(name = "generatedAt")]
    pub generated_at: String,
}

#[derive(SimpleObject)]
#[graphql(name = "ParticipantForceGraphResponse")]
pub struct ParticipantForceGraphResponse {
    pub data: ForceGraphData,
    pub metadata: ForceGraphMetadata,
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

// Force3D Graph types for computed visualization
#[derive(InputObject, Default)]
#[graphql(name = "Force3DGraphParams")]
pub struct Force3DGraphParams {
    #[graphql(name = "selectedEmotions")]
    pub selected_emotions: Option<Vec<String>>,
    #[graphql(name = "selectedModalities")]
    pub selected_modalities: Option<Vec<String>>,
    #[graphql(name = "physicsMode")]
    pub physics_mode: Option<String>,
    pub segment: Option<String>,
    #[graphql(name = "topK")]
    pub top_k: Option<i32>,
    #[graphql(name = "minW")]
    pub min_w: Option<f64>,
    #[graphql(name = "weightGamma")]
    pub weight_gamma: Option<f64>,
    #[graphql(name = "shellRadius")]
    pub shell_radius: Option<f64>,
    #[graphql(name = "restLength")]
    pub rest_length: Option<f64>,
    #[graphql(name = "springK")]
    pub spring_k: Option<f64>,
    #[graphql(name = "selectedWord")]
    pub selected_word: Option<String>,
}

#[derive(SimpleObject, Clone, Debug)]
#[graphql(name = "Force3DGraphNode")]
pub struct Force3DGraphNode {
    pub id: String,
    pub label: String,
    pub scale: f64,
    #[graphql(name = "nodeType")]
    pub node_type: String,
    pub initial: Option<Vec<f64>>,
    pub fixed: bool,
    pub color: Option<String>,
}

#[derive(SimpleObject, Clone, Debug)]
#[graphql(name = "Force3DGraphLink")]
pub struct Force3DGraphLink {
    pub source: i32,
    pub target: i32,
    pub weight: f64,
    pub mode: String,
    #[graphql(name = "L0")]
    pub l0: f64,
    pub k: f64,
    pub color: String,
}

#[derive(SimpleObject)]
#[graphql(name = "Force3DGraphData")]
pub struct Force3DGraphData {
    pub nodes: Vec<Force3DGraphNode>,
    pub links: Vec<Force3DGraphLink>,
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
    async fn participant_timeline(&self, ctx: &Context<'_>, participant_id: String, sample_size: Option<i32>) -> GQLResult<ParticipantTimelineResponse> {
        use diesel::dsl::count;
        
        let total_start = Instant::now();
        let sample_size = sample_size.unwrap_or(2000); // Default to 2000 if not specified
        eprintln!("[GraphQL] participant_timeline: Starting query for participant_id={}, sample_size={}", participant_id, sample_size);
        
        // Get database connection pool
        let pool_start = Instant::now();
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
        let pool_ms = pool_start.elapsed().as_millis() as u64;
        
        eprintln!("[GraphQL] participant_timeline: Database connection acquired");
        
        // Parse participant ID
        let participant_uuid = Uuid::parse_str(&participant_id)
            .map_err(|e| {
                eprintln!("[GraphQL] participant_timeline: Invalid UUID format: participant_id={}, error={:?}", participant_id, e);
                async_graphql::Error::new(format!("Invalid participant ID format '{}': {}", participant_id, e))
            })?;
        
        eprintln!("[GraphQL] participant_timeline: Parsed UUID: {:?}", participant_uuid);
        
        // Check cache first - prioritize sampled_timeline_data if available
        eprintln!("[GraphQL] participant_timeline: Checking cache...");
        use diesel::OptionalExtension;
        
        let cache_check_start = Instant::now();
        
        // First check for sampled_timeline_data (pre-computed for display)
        let cached_sampled: Option<serde_json::Value> = 
            participant_timeline_cache::table
                .filter(participant_timeline_cache::participant_id.eq(participant_uuid))
                .select(participant_timeline_cache::sampled_timeline_data)
                .first(&mut conn)
                .await
                .optional()
                .map_err(|e| {
                    eprintln!("[GraphQL] participant_timeline: Error checking sampled timeline: {:?}", e);
                    async_graphql::Error::new(format!("Failed to check sampled timeline: {}", e))
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
                    async_graphql::Error::new(format!("Failed to check cache metadata: {}", e))
                })?;
        
        // If sampled data exists and sample_size matches (2000), use it directly
        if let Some(sampled_json) = cached_sampled {
            if sample_size == 2000 {
                eprintln!("[GraphQL] participant_timeline: Using pre-computed sampled timeline data");
                let cache_check_ms = cache_check_start.elapsed().as_millis() as u64;
                
                let deserialize_start = Instant::now();
                let sampled_data: Vec<TimelineDataPoint> = serde_json::from_value(sampled_json)
                    .map_err(|e| {
                        eprintln!("[GraphQL] participant_timeline: Error deserializing sampled timeline data: {:?}", e);
                        async_graphql::Error::new(format!("Failed to deserialize sampled timeline data: {}", e))
                    })?;
                let deserialize_ms = deserialize_start.elapsed().as_millis() as u64;
                
                let metadata: TimelineMetadata = if let Some(metadata_json) = cached_metadata {
                    serde_json::from_value(metadata_json)
                        .map_err(|e| {
                            eprintln!("[GraphQL] participant_timeline: Error deserializing cached metadata: {:?}", e);
                            async_graphql::Error::new(format!("Failed to deserialize cached metadata: {}", e))
                        })?
                } else {
                    TimelineMetadata {
                        session_events: None,
                        emotion_entries: None,
                        physiological_entries: None,
                        total_data_points: Some(sampled_data.len() as i32),
                        data_source: Some("precomputed_sampled".to_string()),
                        errors: None,
                        truncated: Some(true),
                        original_size: None,
                    }
                };
                
                let total_ms = total_start.elapsed().as_millis() as u64;
                eprintln!("[Performance] participant_timeline: pool_ms={}, cache_check_ms={}, deserialize_ms={}, total_ms={}, data_points={}", 
                    pool_ms, cache_check_ms, deserialize_ms, total_ms, sampled_data.len());
                
                return Ok(ParticipantTimelineResponse {
                    timeline_data: sampled_data,
                    metadata,
                });
            }
        }
        
        // Fallback to full timeline_data cache
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
        
        let cache_check_ms = cache_check_start.elapsed().as_millis() as u64;
        
        if let (Some(timeline_json), Some(metadata_json)) = (cached_timeline, cached_metadata) {
            eprintln!("[GraphQL] participant_timeline: Cache hit! Returning cached data");
            
            let deserialize_start = Instant::now();
            let timeline_data: Vec<TimelineDataPoint> = serde_json::from_value(timeline_json)
                .map_err(|e| {
                    eprintln!("[GraphQL] participant_timeline: Error deserializing cached timeline data: {:?}", e);
                    async_graphql::Error::new(format!("Failed to deserialize cached timeline data: {}", e))
                })?;
            let mut metadata: TimelineMetadata = serde_json::from_value(metadata_json)
                .map_err(|e| {
                    eprintln!("[GraphQL] participant_timeline: Error deserializing cached metadata: {:?}", e);
                    async_graphql::Error::new(format!("Failed to deserialize cached metadata: {}", e))
                })?;
            let deserialize_ms = deserialize_start.elapsed().as_millis() as u64;
            
            // Apply sampling if needed
            let sampling_start = Instant::now();
            let original_size = timeline_data.len() as i32;
            let final_timeline_data = if sample_size > 0 && timeline_data.len() > sample_size as usize {
                eprintln!("[GraphQL] participant_timeline: Sampling cached data from {} to {} points", timeline_data.len(), sample_size);
                let sampled = sample_timeline_data(timeline_data, sample_size);
                metadata.truncated = Some(true);
                metadata.original_size = Some(original_size);
                sampled
            } else {
                timeline_data
            };
            let sampling_ms = sampling_start.elapsed().as_millis() as u64;
            
            let total_ms = total_start.elapsed().as_millis() as u64;
            eprintln!("[Performance] participant_timeline: pool_ms={}, cache_check_ms={}, deserialize_ms={}, sampling_ms={}, total_ms={}, data_points={}", 
                pool_ms, cache_check_ms, deserialize_ms, sampling_ms, total_ms, final_timeline_data.len());
            
            return Ok(ParticipantTimelineResponse {
                timeline_data: final_timeline_data,
                metadata,
            });
        }
        
        eprintln!("[GraphQL] participant_timeline: Cache miss, computing timeline data in real-time...");
        
        // Fetch participant response data
        let db_query_start = Instant::now();
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
            let total_ms = total_start.elapsed().as_millis() as u64;
            eprintln!("[Performance] participant_timeline: pool_ms={}, cache_check_ms={}, db_query_ms=0, total_ms={}, data_points=0", 
                pool_ms, cache_check_ms, total_ms);
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
        
        let db_query_ms = db_query_start.elapsed().as_millis() as u64;
        
        eprintln!("[GraphQL] participant_timeline: Found {} session events", session_events_count);
        
        // Convert to TimelineDataPoint
        let processing_start = Instant::now();
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
        let processing_ms = processing_start.elapsed().as_millis() as u64;
        
        // Apply sampling if needed
        let sampling_start = Instant::now();
        let original_size = timeline_data.len() as i32;
        let (final_timeline_data, truncated) = if sample_size > 0 && timeline_data.len() > sample_size as usize {
            eprintln!("[GraphQL] participant_timeline: Sampling real-time data from {} to {} points", timeline_data.len(), sample_size);
            let sampled = sample_timeline_data(timeline_data, sample_size);
            (sampled, true)
        } else {
            (timeline_data, false)
        };
        let sampling_ms = sampling_start.elapsed().as_millis() as u64;
        
        // Calculate totals before moving final_timeline_data
        let total_data_points = final_timeline_data.len() as i32;
        let total_emotion_entries: i32 = final_timeline_data.iter().map(|d| d.emotions.len() as i32).sum();
        let total_physiological_entries: i32 = final_timeline_data.iter().filter(|d| d.physiological.average.is_some()).count() as i32;
        
        eprintln!("[GraphQL] participant_timeline: Completed successfully - {} data points, {} emotion entries, {} physiological entries", 
                  total_data_points, total_emotion_entries, total_physiological_entries);
        
        let total_ms = total_start.elapsed().as_millis() as u64;
        eprintln!("[Performance] participant_timeline: pool_ms={}, cache_check_ms={}, db_query_ms={}, processing_ms={}, sampling_ms={}, total_ms={}, data_points={}", 
            pool_ms, cache_check_ms, db_query_ms, processing_ms, sampling_ms, total_ms, total_data_points);
        
        Ok(ParticipantTimelineResponse {
            timeline_data: final_timeline_data,
            metadata: TimelineMetadata {
                session_events: Some(session_events_count as i32),
                emotion_entries: Some(total_emotion_entries),
                physiological_entries: Some(total_physiological_entries),
                total_data_points: Some(total_data_points),
                data_source: Some("realtime".to_string()), // Indicate this is computed in real-time, not from cache
                errors: None,
                truncated: if truncated { Some(true) } else { None },
                original_size: if truncated { Some(original_size) } else { Some(total_data_points) },
            },
        })
    }

    // Merkle DAG: activities.participant_force_graph_data
    // GraphQL query to fetch pre-computed 3D Force graph data
    // RDF: https://spirit-in-physics.gftd.ai/activity/participantForceGraphData
    #[graphql(name = "participantForceGraphData")]
    async fn participant_force_graph_data(&self, ctx: &Context<'_>, participant_id: String) -> GQLResult<ParticipantForceGraphResponse> {
        let total_start = Instant::now();
        eprintln!("[GraphQL] participant_force_graph_data: Starting query for participant_id={}", participant_id);
        
        // Get database connection pool
        let pool_start = Instant::now();
        let pool = ctx.data::<Arc<Pool<AsyncPgConnection>>>()
            .map_err(|e| {
                eprintln!("[GraphQL] participant_force_graph_data: Failed to get database pool: {:?}", e);
                async_graphql::Error::new(format!("Database connection pool error: {:?}", e))
            })?;
        
        let mut conn = pool.get().await
            .map_err(|e| {
                eprintln!("[GraphQL] participant_force_graph_data: Failed to acquire database connection: {:?}", e);
                async_graphql::Error::new(format!("Failed to acquire database connection: {}", e))
            })?;
        let pool_ms = pool_start.elapsed().as_millis() as u64;
        
        // Parse participant ID
        let participant_uuid = Uuid::parse_str(&participant_id)
            .map_err(|e| {
                eprintln!("[GraphQL] participant_force_graph_data: Invalid UUID format: participant_id={}, error={:?}", participant_id, e);
                async_graphql::Error::new(format!("Invalid participant ID format '{}': {}", participant_id, e))
            })?;
        
        // Load force graph data from cache
        let db_query_start = Instant::now();
        use diesel::OptionalExtension;
        let force_graph_json: Option<serde_json::Value> = 
            participant_timeline_cache::table
                .filter(participant_timeline_cache::participant_id.eq(participant_uuid))
                .select(participant_timeline_cache::force_graph_data)
                .first(&mut conn)
                .await
                .optional()
                .map_err(|e| {
                    eprintln!("[GraphQL] participant_force_graph_data: Error loading force graph data: {:?}", e);
                    async_graphql::Error::new(format!("Failed to load force graph data: {}", e))
                })?;
        
        let force_graph_metadata_json: Option<serde_json::Value> = 
            participant_timeline_cache::table
                .filter(participant_timeline_cache::participant_id.eq(participant_uuid))
                .select(participant_timeline_cache::force_graph_metadata)
                .first(&mut conn)
                .await
                .optional()
                .map_err(|e| {
                    eprintln!("[GraphQL] participant_force_graph_data: Error loading force graph metadata: {:?}", e);
                    async_graphql::Error::new(format!("Failed to load force graph metadata: {}", e))
                })?;
        let db_query_ms = db_query_start.elapsed().as_millis() as u64;
        
        if let (Some(graph_json), Some(metadata_json)) = (force_graph_json, force_graph_metadata_json) {
            eprintln!("[GraphQL] participant_force_graph_data: Found pre-computed force graph data");
            
            // Deserialize JSON to our GraphQL types
            let deserialize_start = Instant::now();
            let graph_value: serde_json::Value = serde_json::from_value(graph_json)
                .map_err(|e| {
                    eprintln!("[GraphQL] participant_force_graph_data: Error deserializing force graph data: {:?}", e);
                    async_graphql::Error::new(format!("Failed to deserialize force graph data: {}", e))
                })?;
            
            let metadata_value: serde_json::Value = serde_json::from_value(metadata_json)
                .map_err(|e| {
                    eprintln!("[GraphQL] participant_force_graph_data: Error deserializing force graph metadata: {:?}", e);
                    async_graphql::Error::new(format!("Failed to deserialize force graph metadata: {}", e))
                })?;
            let deserialize_ms = deserialize_start.elapsed().as_millis() as u64;
            
            // Convert JSON to GraphQL types
            let conversion_start = Instant::now();
            let nodes_json = graph_value.get("nodes")
                .and_then(|v| v.as_array())
                .ok_or_else(|| async_graphql::Error::new("Invalid force graph data: missing nodes"))?;
            
            let links_json = graph_value.get("links")
                .and_then(|v| v.as_array())
                .ok_or_else(|| async_graphql::Error::new("Invalid force graph data: missing links"))?;
            
            let mut nodes: Vec<ForceGraphNode> = Vec::new();
            for node_json in nodes_json {
                let id = node_json.get("id")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| async_graphql::Error::new("Invalid node: missing id"))?
                    .to_string();
                
                let label = node_json.get("label")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| async_graphql::Error::new("Invalid node: missing label"))?
                    .to_string();
                
                let rt_stats_json = node_json.get("reactionTime")
                    .ok_or_else(|| async_graphql::Error::new("Invalid node: missing reactionTime"))?;
                let reaction_time = ForceGraphStats {
                    avg: rt_stats_json.get("avg").and_then(|v| v.as_f64()).unwrap_or(0.0),
                    std_dev: rt_stats_json.get("std_dev").or_else(|| rt_stats_json.get("stdDev")).and_then(|v| v.as_f64()).unwrap_or(0.0),
                    max: rt_stats_json.get("max").and_then(|v| v.as_f64()).unwrap_or(0.0),
                    min: rt_stats_json.get("min").and_then(|v| v.as_f64()).unwrap_or(0.0),
                    count: rt_stats_json.get("count").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                };
                
                let emotions_json = node_json.get("emotions")
                    .and_then(|v| v.as_object())
                    .ok_or_else(|| async_graphql::Error::new("Invalid node: missing emotions"))?;
                
                let mut emotions: std::collections::HashMap<String, ForceGraphStats> = std::collections::HashMap::new();
                for (emotion_name, stats_json) in emotions_json {
                    if let Some(stats_obj) = stats_json.as_object() {
                        emotions.insert(emotion_name.clone(), ForceGraphStats {
                            avg: stats_obj.get("avg").and_then(|v| v.as_f64()).unwrap_or(0.0),
                            std_dev: stats_obj.get("std_dev").or_else(|| stats_obj.get("stdDev")).and_then(|v| v.as_f64()).unwrap_or(0.0),
                            max: stats_obj.get("max").and_then(|v| v.as_f64()).unwrap_or(0.0),
                            min: stats_obj.get("min").and_then(|v| v.as_f64()).unwrap_or(0.0),
                            count: stats_obj.get("count").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                        });
                    }
                }
                
                let ph_stats_json = node_json.get("physiological")
                    .ok_or_else(|| async_graphql::Error::new("Invalid node: missing physiological"))?;
                let physiological = ForceGraphStats {
                    avg: ph_stats_json.get("avg").and_then(|v| v.as_f64()).unwrap_or(0.0),
                    std_dev: ph_stats_json.get("std_dev").or_else(|| ph_stats_json.get("stdDev")).and_then(|v| v.as_f64()).unwrap_or(0.0),
                    max: ph_stats_json.get("max").and_then(|v| v.as_f64()).unwrap_or(0.0),
                    min: ph_stats_json.get("min").and_then(|v| v.as_f64()).unwrap_or(0.0),
                    count: ph_stats_json.get("count").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                };
                
                nodes.push(ForceGraphNode {
                    id,
                    label,
                    reaction_time,
                    emotions,
                    physiological,
                });
            }
            
            let mut links: Vec<ForceGraphLink> = Vec::new();
            for link_json in links_json {
                let source = link_json.get("source")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| async_graphql::Error::new("Invalid link: missing source"))?
                    .to_string();
                
                let target = link_json.get("target")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| async_graphql::Error::new("Invalid link: missing target"))?
                    .to_string();
                
                let weight = link_json.get("weight")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0);
                
                let correlation_type = link_json.get("correlationType")
                    .or_else(|| link_json.get("correlation_type"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("emotion")
                    .to_string();
                
                links.push(ForceGraphLink {
                    source,
                    target,
                    weight,
                    correlation_type,
                });
            }
            
            let node_count = metadata_value.get("node_count")
                .or_else(|| metadata_value.get("nodeCount"))
                .and_then(|v| v.as_i64())
                .unwrap_or(nodes.len() as i64) as i32;
            
            let link_count = metadata_value.get("link_count")
                .or_else(|| metadata_value.get("linkCount"))
                .and_then(|v| v.as_i64())
                .unwrap_or(links.len() as i64) as i32;
            
            let generated_at = metadata_value.get("generated_at")
                .or_else(|| metadata_value.get("generatedAt"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            
            let conversion_ms = conversion_start.elapsed().as_millis() as u64;
            let total_ms = total_start.elapsed().as_millis() as u64;
            eprintln!("[Performance] participant_force_graph_data: pool_ms={}, db_query_ms={}, deserialize_ms={}, conversion_ms={}, total_ms={}, nodes={}, links={}", 
                pool_ms, db_query_ms, deserialize_ms, conversion_ms, total_ms, nodes.len(), links.len());
            
            Ok(ParticipantForceGraphResponse {
                data: ForceGraphData { nodes, links },
                metadata: ForceGraphMetadata {
                    node_count,
                    link_count,
                    generated_at,
                },
            })
        } else {
            let total_ms = total_start.elapsed().as_millis() as u64;
            eprintln!("[Performance] participant_force_graph_data: pool_ms={}, db_query_ms={}, total_ms={}, result=not_found", 
                pool_ms, db_query_ms, total_ms);
            eprintln!("[GraphQL] participant_force_graph_data: No pre-computed force graph data found");
            Err(async_graphql::Error::new("Force graph data not yet generated. Please run display data generation first."))
        }
    }

    // Merkle DAG: activities.participant_force3d_graph
    // GraphQL query to compute 3D Force graph data with parameters
    // RDF: https://spirit-in-physics.gftd.ai/activity/participantForce3DGraph
    #[graphql(name = "participantForce3DGraph")]
    async fn participant_force3d_graph(
        &self,
        ctx: &Context<'_>,
        participant_id: String,
        params: Option<Force3DGraphParams>,
    ) -> GQLResult<Force3DGraphData> {
        let total_start = Instant::now();
        eprintln!("[GraphQL] participant_force3d_graph: Starting query for participant_id={}", participant_id);

        // Get timeline data first
        let timeline_response = match self.participant_timeline(ctx, participant_id.clone(), Some(2000)).await {
            Ok(resp) => resp,
            Err(e) => {
                eprintln!("[GraphQL] participant_force3d_graph: Failed to get timeline data: {:?}", e);
                return Err(e);
            }
        };
        let timeline_data = timeline_response.timeline_data.clone();

        if timeline_data.is_empty() {
            return Err(async_graphql::Error::new("No timeline data available for this participant"));
        }

        // Parse parameters with defaults
        let params = params.unwrap_or_default();
        let selected_emotions: std::collections::HashSet<String> = params.selected_emotions
            .unwrap_or_else(|| vec!["joy".to_string(), "sadness".to_string(), "anger".to_string(), "fear".to_string(), "surprise".to_string(), "disgust".to_string(), "calm".to_string(), "focus".to_string(), "excitement".to_string(), "confusion".to_string()])
            .into_iter()
            .collect();
        let selected_modalities: std::collections::HashSet<String> = params.selected_modalities
            .unwrap_or_else(|| vec!["prosody".to_string(), "face".to_string(), "language".to_string(), "burst".to_string()])
            .into_iter()
            .collect();
        let physics_mode = params.physics_mode.unwrap_or_else(|| "emotion".to_string());
        let segment = params.segment.unwrap_or_else(|| "all".to_string());
        let top_k = params.top_k.unwrap_or(2);
        let min_w = params.min_w.unwrap_or(0.25);
        let weight_gamma = params.weight_gamma.unwrap_or(1.6);
        let shell_radius = params.shell_radius.unwrap_or(300.0);
        let rest_length = params.rest_length.unwrap_or(80.0);
        let spring_k = params.spring_k.unwrap_or(2.0);
        let selected_word = params.selected_word;

        // Jung stimulus words (100 words) - using word_stimuli table IDs
        // For now, we'll use a simplified approach and get words from timeline data
        use std::collections::HashSet;
        let mut unique_words: HashSet<String> = HashSet::new();
        for point in &timeline_data {
            unique_words.insert(point.word.clone());
        }
        let mut jung_words: Vec<(i32, String)> = unique_words.into_iter()
            .enumerate()
            .map(|(idx, word)| (idx as i32, word))
            .collect();
        jung_words.sort_by(|a, b| a.1.cmp(&b.1));

        // Segment data based on segment parameter
        let session_data: Vec<&TimelineDataPoint> = match segment.as_str() {
            "first100" => timeline_data.iter().take(100).collect(),
            "next100" => timeline_data.iter().skip(100).take(100).collect(),
            _ => timeline_data.iter().collect(),
        };

        // Emotion keys mapping
        let emotion_keys = vec!["joy", "sadness", "anger", "fear", "surprise", "disgust", "calm", "focus", "excitement", "confusion"];
        let emotion_index: std::collections::HashMap<String, usize> = emotion_keys.iter()
            .enumerate()
            .map(|(i, k)| (k.to_string(), i))
            .collect();

        // Aggregate word statistics
        use std::collections::HashMap;
        let mut accum: HashMap<String, (i32, f64, i32, f64)> = HashMap::new(); // count, sumReactionValue, sumReactionTime, sumPhysAbs
        let mut phys_by_series: HashMap<String, Vec<f64>> = HashMap::new();
        let mut rt_by_series: HashMap<String, Vec<i32>> = HashMap::new();

        for (_, japanese) in &jung_words {
            accum.insert(japanese.clone(), (0, 0.0, 0, 0.0));
        }

        for d in &session_data {
            if let Some(acc) = accum.get_mut(&d.word) {
                acc.0 += 1;
                acc.1 += d.reaction_value;
                acc.2 += d.reaction_time;
                
                if let Some(avg) = d.physiological.average {
                    if avg.is_finite() {
                        acc.3 += avg.abs();
                        phys_by_series.entry(d.word.clone()).or_insert_with(Vec::new).push(avg);
                    }
                }
                rt_by_series.entry(d.word.clone()).or_insert_with(Vec::new).push(d.reaction_time);
            }
        }

        // Calculate node entries
        let mut node_entries: Vec<(String, i32, f64, f64)> = Vec::new(); // japanese, count, avgReactionValue, raw
        for (_, japanese) in &jung_words {
            let acc = accum.get(japanese).unwrap_or(&(0, 0.0, 0, 0.0));
            let avg_rv = if acc.0 > 0 { acc.1 / acc.0 as f64 } else { 0.0 };
            let raw = avg_rv * (1.0 + acc.0 as f64).ln();
            node_entries.push((japanese.clone(), acc.0, avg_rv, raw));
        }

        let raw_min = node_entries.iter().map(|(_, _, _, r)| *r).fold(f64::INFINITY, f64::min);
        let raw_max = node_entries.iter().map(|(_, _, _, r)| *r).fold(f64::NEG_INFINITY, f64::max);
        let denom = if (raw_max - raw_min).abs() < 1e-10 { 1.0 } else { raw_max - raw_min };

        // Create word nodes
        let mut nodes: Vec<Force3DGraphNode> = node_entries.iter()
            .enumerate()
            .map(|(idx, (japanese, _, _, raw))| {
                let scale = (0.5 + 5.5 * ((raw - raw_min) / denom)).max(0.5);
                Force3DGraphNode {
                    id: idx.to_string(),
                    label: japanese.clone(),
                    scale,
                    node_type: "word".to_string(),
                    initial: None,
                    fixed: false,
                    color: None,
                }
            })
            .collect();

        // Aggregate emotion data
        let mut word_emotion_sum: HashMap<String, Vec<f64>> = HashMap::new();
        const MAX_EMOTIONS_PER_RESPONSE: usize = 10;

        for d in &session_data {
            let w = &d.word;
            word_emotion_sum.entry(w.clone()).or_insert_with(|| vec![0.0; emotion_keys.len()]);
            
            let mut sorted_emotions: Vec<&EmotionData> = d.emotions.iter()
                .filter(|e| {
                    let key = e.name.to_lowercase();
                    if !emotion_index.contains_key(&key) {
                        return false;
                    }
                    let ft = e.file_type.to_lowercase();
                    let mod_str = if ft.contains("prosody") { "prosody" }
                        else if ft.contains("burst") { "burst" }
                        else if ft.contains("face") { "face" }
                        else if ft.contains("language") { "language" }
                        else { return true; };
                    selected_modalities.contains(&mod_str.to_string())
                })
                .collect();
            sorted_emotions.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
            
            for e in sorted_emotions.iter().take(MAX_EMOTIONS_PER_RESPONSE) {
                let key = e.name.to_lowercase();
                if let Some(&idx) = emotion_index.get(&key) {
                    if let Some(sum_vec) = word_emotion_sum.get_mut(w) {
                        sum_vec[idx] += e.score;
                    }
                }
            }
        }

        // Normalize emotion vectors
        let normalize = |vec: &[f64]| -> Vec<f64> {
            let norm: f64 = vec.iter().map(|x| x * x).sum::<f64>().sqrt();
            if norm.abs() < 1e-10 {
                vec![0.0; vec.len()]
            } else {
                vec.iter().map(|x| x / norm).collect()
            }
        };

        let mut normalized_emotion_vec: HashMap<String, Vec<f64>> = HashMap::new();
        for (w, sum_vec) in &word_emotion_sum {
            normalized_emotion_vec.insert(w.clone(), normalize(sum_vec));
        }

        // Calculate physics mode factors
        let mut phys_by_word: HashMap<String, f64> = HashMap::new();
        let mut phys_std_by_word: HashMap<String, f64> = HashMap::new();
        let mut speed_by_word: HashMap<String, f64> = HashMap::new();

        for (_, japanese) in &jung_words {
            let acc = accum.get(japanese).unwrap_or(&(0, 0.0, 0, 0.0));
            let c = acc.0;
            let phys_avg = if c > 0 { acc.3 / c as f64 } else { 0.0 };
            
            let series = phys_by_series.get(japanese).cloned().unwrap_or_default();
            let mean = if !series.is_empty() {
                series.iter().sum::<f64>() / series.len() as f64
            } else {
                0.0
            };
            let variance = if !series.is_empty() {
                series.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / series.len() as f64
            } else {
                0.0
            };
            let phys_std = variance.max(0.0).sqrt();
            let speed = if c > 0 { 1.0 / (acc.2 as f64 / c as f64).max(1.0) } else { 0.0 };
            
            phys_by_word.insert(japanese.clone(), phys_avg);
            phys_std_by_word.insert(japanese.clone(), phys_std);
            speed_by_word.insert(japanese.clone(), speed);
        }

        let phys_values: Vec<f64> = phys_by_word.values().cloned().collect();
        let phys_std_values: Vec<f64> = phys_std_by_word.values().cloned().collect();
        let speed_values: Vec<f64> = speed_by_word.values().cloned().collect();

        let min_max = |arr: &[f64]| -> (f64, f64) {
            let min = arr.iter().cloned().fold(f64::INFINITY, f64::min).max(0.0);
            let max = arr.iter().cloned().fold(f64::NEG_INFINITY, f64::max).max(1e-6);
            (min, max)
        };

        let pm = min_max(&phys_values);
        let psm = min_max(&phys_std_values);
        let sm = min_max(&speed_values);

        let norm01 = |x: f64, (min, max): (f64, f64)| -> f64 {
            if (max - min).abs() < 1e-10 { 0.0 } else { (x - min) / (max - min) }
        };

        // Adjust node scales based on physics mode
        for node in &mut nodes {
            let w = &node.label;
            let strength = norm01(phys_by_word.get(w).copied().unwrap_or(0.0), pm);
            let change = norm01(phys_std_by_word.get(w).copied().unwrap_or(0.0), psm);
            let m = 0.6 * strength + 0.4 * change;
            
            if physics_mode != "emotion" {
                node.scale = (node.scale * (0.7 + 1.3 * m)).max(0.5).min(10.0);
            }
        }

        // Create anchor nodes
        let anchor_2d = vec![
            ("Joy", 0.15, 0.85, "#f59e0b"),
            ("Sadness", 0.70, 0.45, "#1f2937"),
            ("Anger", 0.82, 0.25, "#ef4444"),
            ("Fear", 0.92, 0.10, "#a78bfa"),
            ("Disgust", 0.78, 0.52, "#10b981"),
            ("Calmness", 0.28, 0.70, "#93c5fd"),
            ("Interest", 0.35, 0.55, "#60a5fa"),
            ("Surprise", 0.40, 0.20, "#22c55e"),
            ("Confusion", 0.48, 0.35, "#64748b"),
            ("Determination", 0.22, 0.85, "#f97316"),
        ];

        let anchor_to_key: HashMap<&str, &str> = [
            ("Joy", "joy"), ("Sadness", "sadness"), ("Anger", "anger"), ("Fear", "fear"),
            ("Disgust", "disgust"), ("Calmness", "calm"), ("Interest", "focus"),
            ("Surprise", "surprise"), ("Confusion", "confusion"), ("Determination", "focus"),
        ].iter().cloned().collect();

        let to_sphere = |x01: f64, y01: f64, radius: f64| -> [f64; 3] {
            let u = (x01 - 0.5) * std::f64::consts::PI * 1.6;
            let v = (y01 - 0.5) * std::f64::consts::PI;
            let cx = v.cos() * u.cos();
            let cy = v.cos() * u.sin();
            let cz = v.sin();
            [radius * cx, radius * cy, radius * cz]
        };

        let mut anchor_nodes: Vec<Force3DGraphNode> = anchor_2d.iter()
            .enumerate()
            .map(|(idx, (name, x, y, color))| {
                let [x, y, z] = to_sphere(*x, *y, shell_radius);
                Force3DGraphNode {
                    id: format!("A{}", idx),
                    label: name.to_string(),
                    scale: 6.0,
                    node_type: "anchor".to_string(),
                    initial: Some(vec![x, y, z]),
                    fixed: true,
                    color: Some(color.to_string()),
                }
            })
            .collect();

        let base_offset = nodes.len();
        let anchor_positions: Vec<[f64; 3]> = anchor_nodes.iter()
            .map(|a| {
                if let Some(init) = &a.initial {
                    [init[0], init[1], init[2]]
                } else {
                    [0.0, 0.0, 0.0]
                }
            })
            .collect();

        // Generate links
        let mut links: Vec<Force3DGraphLink> = Vec::new();
        let emotion_color: HashMap<&str, &str> = [
            ("joy", "#f59e0b"), ("sadness", "#1f2937"), ("anger", "#ef4444"), ("fear", "#a78bfa"),
            ("surprise", "#22c55e"), ("disgust", "#10b981"), ("calm", "#93c5fd"), ("focus", "#60a5fa"),
            ("excitement", "#22d3ee"), ("confusion", "#64748b"),
        ].iter().cloned().collect();

        for (wi, node) in nodes.iter().enumerate() {
            let word_index = base_offset + wi;
            let label = &node.label;
            let ei = normalized_emotion_vec.get(label).cloned().unwrap_or_else(|| vec![0.0; emotion_keys.len()]);

            // Calculate weights for each anchor
            let mut weights: Vec<(usize, f64)> = anchor_nodes.iter()
                .enumerate()
                .map(|(ai, a)| {
                    let key = anchor_to_key.get(a.label.as_str()).copied();
                    if let Some(k) = key {
                        if !selected_emotions.contains(&k.to_string()) {
                            return (ai, 0.0);
                        }
                        if let Some(&k_idx) = emotion_index.get(k) {
                            let sim = ei.get(k_idx).copied().unwrap_or(0.0);
                            let w = sim.max(0.0).min(1.0).powf(weight_gamma);
                            return (ai, w);
                        }
                    }
                    let avg = ei.iter().sum::<f64>() / ei.len().max(1) as f64;
                    let w = avg.max(0.0).min(1.0).powf(weight_gamma);
                    (ai, w)
                })
                .collect();

            weights.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
            let mut chosen: Vec<(usize, f64)> = weights.iter()
                .filter(|(_, w)| *w >= min_w)
                .take(top_k as usize)
                .cloned()
                .collect();
            if chosen.is_empty() && !weights.is_empty() {
                chosen = vec![weights[0]];
            }

            // Calculate physics mode factor
            let factor = match physics_mode.as_str() {
                "all" => {
                    0.5 * (ei.iter().sum::<f64>() / ei.len().max(1) as f64)
                        + 0.3 * norm01(phys_by_word.get(label).copied().unwrap_or(0.0), pm)
                        + 0.2 * norm01(speed_by_word.get(label).copied().unwrap_or(0.0), sm)
                }
                "physio" => norm01(phys_by_word.get(label).copied().unwrap_or(0.0), pm),
                "reactionSpeed" => norm01(speed_by_word.get(label).copied().unwrap_or(0.0), sm),
                _ => 1.0,
            };

            // Calculate initial position (using simple hash-based jitter instead of random)
            if !chosen.is_empty() {
                let mut vx = 0.0;
                let mut vy = 0.0;
                let mut vz = 0.0;
                let mut sw = 0.0;
                for (ai, w) in &chosen {
                    let p = anchor_positions[*ai];
                    vx += p[0] * w;
                    vy += p[1] * w;
                    vz += p[2] * w;
                    sw += w;
                }
                if sw > 0.0 {
                    vx /= sw;
                    vy /= sw;
                    vz /= sw;
                    let len = (vx * vx + vy * vy + vz * vz).sqrt().max(1e-10);
                    let r = shell_radius * 0.65;
                    // Use hash-based jitter instead of random
                    let jitter = 1.0 + ((label.len() as f64 * 0.1) % 0.1) - 0.05;
                    let init = [(vx / len) * r * jitter, (vy / len) * r * jitter, (vz / len) * r * jitter];
                    nodes[wi].initial = Some(vec![init[0], init[1], init[2]]);
                }
            }

            // Generate links
            for (ai, w) in &chosen {
                let a = &anchor_nodes[*ai];
                let key = anchor_to_key.get(a.label.as_str()).copied();
                let base_color = key.and_then(|k| emotion_color.get(k).copied());
                let w_final = (w * factor.max(0.1)).max(0.0).min(1.0);
                let l0 = (rest_length * (1.0 - 0.6 * w_final)).max(20.0);
                let k = spring_k * (0.3 + 0.7 * w_final);
                let alpha = (0.12 + 0.88 * w_final).max(0.12).min(0.95);
                
                let color = if let Some(base) = base_color {
                    let r = u8::from_str_radix(&base[1..3], 16).unwrap_or(0);
                    let g = u8::from_str_radix(&base[3..5], 16).unwrap_or(0);
                    let b = u8::from_str_radix(&base[5..7], 16).unwrap_or(0);
                    format!("rgba({}, {}, {}, {:.3})", r, g, b, alpha)
                } else {
                    format!("rgba(30, 64, 175, {:.3})", alpha)
                };

                links.push(Force3DGraphLink {
                    source: *ai as i32,
                    target: word_index as i32,
                    weight: w_final,
                    mode: "tension".to_string(),
                    l0,
                    k,
                    color,
                });
            }
        }

        // Handle selected word
        if let Some(sw) = selected_word {
            if let Some(idx) = nodes.iter().position(|n| n.label == sw) {
                nodes[idx].fixed = true;
                nodes[idx].initial = Some(vec![0.0, 0.0, 0.0]);
                nodes[idx].scale = nodes[idx].scale.max(6.0);
                nodes[idx].color = Some("#111827".to_string());
            }
        }

        // Combine anchor nodes and word nodes
        let mut all_nodes = anchor_nodes;
        all_nodes.extend(nodes);

        let total_ms = total_start.elapsed().as_millis() as u64;
        eprintln!("[Performance] participant_force3d_graph: total_ms={}, nodes={}, links={}", 
            total_ms, all_nodes.len(), links.len());

        Ok(Force3DGraphData {
            nodes: all_nodes,
            links,
        })
    }
}

// Sample timeline data using intelligent sampling strategy
// 1. Equal interval sampling
// 2. Keep important events (large emotion changes, abnormal reaction times)
// 3. Ensure even distribution across Jung stimulus words
fn sample_timeline_data(data: Vec<TimelineDataPoint>, sample_size: i32) -> Vec<TimelineDataPoint> {
    use std::collections::{HashMap, HashSet};
    
    if data.len() <= sample_size as usize {
        return data;
    }
    
    let sample_size = sample_size as usize;
    let mut sampled: Vec<TimelineDataPoint> = Vec::with_capacity(sample_size);
    let mut selected_indices: HashSet<usize> = HashSet::new();
    
    // Step 1: Identify important events (keep top 10% of events with largest emotion variance or abnormal reaction times)
    let important_count = (sample_size / 10).max(50); // At least 50 important events
    
    // Calculate emotion variance for each data point
    let mut emotion_variances: Vec<(usize, f64)> = data.iter().enumerate().map(|(idx, point)| {
        let emotion_scores: Vec<f64> = point.emotions.iter().map(|e| e.score).collect();
        let variance = if emotion_scores.len() > 1 {
            let mean = emotion_scores.iter().sum::<f64>() / emotion_scores.len() as f64;
            let variance = emotion_scores.iter().map(|&s| (s - mean).powi(2)).sum::<f64>() / emotion_scores.len() as f64;
            variance
        } else {
            0.0
        };
        (idx, variance)
    }).collect();
    
    // Sort by variance (descending) and select top important events
    emotion_variances.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    for (idx, _) in emotion_variances.iter().take(important_count) {
        selected_indices.insert(*idx);
    }
    
    // Also select events with abnormal reaction times (very fast or very slow)
    let reaction_times: Vec<(usize, i32)> = data.iter().enumerate()
        .map(|(idx, point)| (idx, point.reaction_time))
        .collect();
    let rt_mean = reaction_times.iter().map(|(_, rt)| *rt as f64).sum::<f64>() / reaction_times.len() as f64;
    let rt_std = (reaction_times.iter().map(|(_, rt)| ((*rt as f64) - rt_mean).powi(2)).sum::<f64>() / reaction_times.len() as f64).sqrt();
    
    for (idx, rt) in reaction_times {
        if !selected_indices.contains(&idx) {
            let rt_f64 = rt as f64;
            // Select if reaction time is more than 2 standard deviations from mean
            if (rt_f64 - rt_mean).abs() > 2.0 * rt_std {
                selected_indices.insert(idx);
                if selected_indices.len() >= sample_size {
                    break;
                }
            }
        }
    }
    
    // Step 2: Ensure even distribution across Jung stimulus words (100 words)
    let mut word_counts: HashMap<String, usize> = HashMap::new();
    let target_per_word = (sample_size / 100).max(1); // At least 1 per word
    
    // Count occurrences of each word in selected indices
    for &idx in &selected_indices {
        let word = &data[idx].word;
        *word_counts.entry(word.clone()).or_insert(0) += 1;
    }
    
    // Add more samples for words that are underrepresented
    for (word, &count) in &word_counts {
        if count < target_per_word {
            let needed = target_per_word - count;
            let word_indices: Vec<usize> = data.iter().enumerate()
                .filter(|(idx, point)| point.word == *word && !selected_indices.contains(idx))
                .map(|(idx, _)| idx)
                .collect();
            
            for idx in word_indices.iter().take(needed) {
                selected_indices.insert(*idx);
                if selected_indices.len() >= sample_size {
                    break;
                }
            }
        }
    }
    
    // Step 3: Fill remaining slots with equal interval sampling
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
    
    // Step 4: Collect sampled data points in chronological order
    let mut selected_indices_vec: Vec<usize> = selected_indices.into_iter().collect();
    selected_indices_vec.sort();
    
    // Limit to sample_size
    if selected_indices_vec.len() > sample_size {
        // Take evenly spaced indices from the sorted list
        let step = selected_indices_vec.len() / sample_size;
        selected_indices_vec = selected_indices_vec.into_iter()
            .enumerate()
            .filter(|(i, _)| i % step == 0)
            .map(|(_, idx)| idx)
            .take(sample_size)
            .collect();
    }
    
    for idx in selected_indices_vec {
        sampled.push(data[idx].clone());
    }
    
    sampled
}

impl Query {
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

    // Merkle DAG: activities.participant_word2vec
    // GraphQL query to fetch word2vec embeddings for a participant
    // RDF: https://spirit-in-physics.gftd.ai/activity/participantWord2Vec
    #[graphql(name = "participantWord2Vec")]
    async fn participant_word2vec(&self, ctx: &Context<'_>, participant_id: String) -> GQLResult<ParticipantWord2VecResponse> {
        let total_start = Instant::now();
        eprintln!("[GraphQL] participant_word2vec: Starting query for participant_id={}", participant_id);
        
        // Get database connection pool
        let pool_start = Instant::now();
        let pool = ctx.data::<Arc<Pool<AsyncPgConnection>>>()
            .map_err(|e| {
                eprintln!("[GraphQL] participant_word2vec: Failed to get database pool: {:?}", e);
                async_graphql::Error::new(format!("Database connection pool error: {:?}", e))
            })?;
        
        let mut conn = pool.get().await
            .map_err(|e| {
                eprintln!("[GraphQL] participant_word2vec: Failed to acquire database connection: {:?}", e);
                async_graphql::Error::new(format!("Failed to acquire database connection: {}", e))
            })?;
        let pool_ms = pool_start.elapsed().as_millis() as u64;
        
        // Parse participant ID
        let participant_uuid = Uuid::parse_str(&participant_id)
            .map_err(|e| {
                eprintln!("[GraphQL] participant_word2vec: Invalid UUID format: participant_id={}, error={:?}", participant_id, e);
                async_graphql::Error::new(format!("Invalid participant ID format '{}': {}", participant_id, e))
            })?;
        
        // Fetch participant response data grouped by stimulus_word
        let db_query_start = Instant::now();
        eprintln!("[GraphQL] participant_word2vec: Fetching response data from database...");
        type ResponseRow = (String,);
        let all_words: Vec<ResponseRow> = 
            participant_response_data::table
                .filter(participant_response_data::participant_id.eq(participant_uuid))
                .select(participant_response_data::stimulus_word)
                .order(participant_response_data::stimulus_word.asc())
                .load(&mut conn)
                .await
                .map_err(|e| {
                    eprintln!("[GraphQL] participant_word2vec: Database query error when fetching words: {:?}", e);
                    async_graphql::Error::new(format!("Failed to fetch word data for participant {}: {}", participant_id, e))
                })?;
        
        // Remove duplicates in Rust (since Diesel's distinct() requires different syntax)
        use std::collections::HashSet;
        let mut seen = HashSet::new();
        let words: Vec<ResponseRow> = all_words
            .into_iter()
            .filter(|(word,)| seen.insert(word.clone()))
            .collect();
        
        let db_query_ms = db_query_start.elapsed().as_millis() as u64;
        eprintln!("[GraphQL] participant_word2vec: Fetched {} unique words", words.len());
        
        // Convert to Word2VecData format
        // Note: Currently, word2vec_component is a single Float value in participant_analysis_results,
        // but Word2VecData expects an embedding vector (array). For now, we return empty arrays.
        // In the future, this should fetch embeddings from an external service (e.g., TerminusDB).
        let processing_start = Instant::now();
        let word_data: Vec<Word2VecData> = words.into_iter().map(|(word,)| {
            Word2VecData {
                word,
                embedding: vec![], // Placeholder: empty array until external service integration
            }
        }).collect();
        let processing_ms = processing_start.elapsed().as_millis() as u64;
        
        let total_ms = total_start.elapsed().as_millis() as u64;
        eprintln!("[Performance] participant_word2vec: pool_ms={}, db_query_ms={}, processing_ms={}, total_ms={}, word_count={}", 
            pool_ms, db_query_ms, processing_ms, total_ms, word_data.len());
        
        Ok(ParticipantWord2VecResponse { 
            word_data 
        })
    }

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
