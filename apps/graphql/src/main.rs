use async_graphql::{
    Context, EmptyMutation, EmptySubscription, Object, Schema, SimpleObject,
    http::{GraphQLPlaygroundConfig, playground_source},
    InputObject,
};
use async_graphql_warp::graphql;
use dotenvy::dotenv;
use std::sync::Arc;
use std::convert::Infallible;
use warp::{Filter, Reply};

use async_graphql::{Context, EmptySubscription, Object, Query, Result as GQLResult, SchemaBuilder};
use diesel::prelude::*;
use std::sync::Arc;
use tokio_postgres::NoTls;
use diesel_async::pooled_connection::deadpool::Pool;
use diesel_async::RunQueryDsl;
use serde_json::json;

use crate::models::{
    Participant, NewParticipant, Experiment, NewExperiment, Window, NewWindow,
    EmotionAggregation, NewEmotionAggregation, PhysiologicalAggregation, NewPhysiologicalAggregation,
    KernelFusionRun, NewKernelFusionRun, EmbeddingResult, NewEmbeddingResult,
    ParticipantConsent, NewParticipantConsent,
    ParticipantExperimentSession, NewParticipantExperimentSession,
    ParticipantResponseData, NewParticipantResponseData,
    ParticipantAnalysisResult, NewParticipantAnalysisResult,
    WordStimulus, NewWordStimulus,
};
use crate::schema::{
    participants, participant_consents, participant_experiment_sessions,
    participant_response_data, participant_analysis_results, word_stimuli,
};

mod constants;
mod db;
mod hume_client;
mod models;
mod activities;

use db::{DbPool, establish_connection};
use activities::{jung_test_activity, emotion_analysis_activity_from_url};

#[derive(SimpleObject)]
struct Participant {
    id: String,
    age: Option<i32>,
    gender: Option<String>,
    handedness: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(InputObject)]
struct EmotionDistanceInput {
    participant_id: String,
    experiment_id: Option<String>,
    method: Option<String>,
    embedding_method: Option<String>,
    dimensions: Option<i32>,
    k: Option<i32>,
    gamma: Option<f64>,
    alpha: Option<f64>,
    top_k_emotions: Option<Vec<String>>,
    normalization: Option<String>,
    non_negative_weights: Option<bool>,
    time_kernel: Option<serde_json::Value>,
}

#[derive(InputObject)]
struct WindowsGenerationInput {
    participant_id: String,
    session_uri: Option<String>,
    physio_uri: Option<String>,
    hume_csv_uris: Option<serde_json::Value>,
}

#[derive(InputObject)]
struct CalculateEmotionDistanceInput {
    participant_id: String,
    experiment_id: Option<String>,
    method: Option<String>, // "cosine", "euclidean", etc.
    embedding_method: Option<String>, // "pca", "tsne", "umap", etc.
    dimensions: Option<i32>,
    k: Option<i32>,
    gamma: Option<f64>,
    alpha: Option<f64>,
    top_k_emotions: Option<Vec<String>>,
}

#[derive(SimpleObject)]
struct PipelineStepStatus {
    file_import: String,
    windows_generation: String,
    kernel_fusion: String,
}

#[derive(SimpleObject)]
struct PipelineStatus {
    participant_id: String,
    status: String,
    steps: PipelineStepStatus,
    progress: i32,
    timestamp: String,
}

// GraphQL types for Visualizer app
#[derive(SimpleObject)]
struct EmotionData {
    name: String,
    score: f64,
    file_type: String,
}

#[derive(SimpleObject)]
struct TimelineDataPoint {
    timestamp: i64,
    word: String,
    reaction_time: i32,
    has_response: bool,
    emotions: Vec<EmotionData>,
    physiological: serde_json::Value,
    reaction_value: f64,
    event_type: Option<String>,
    metadata: Option<serde_json::Value>,
}

#[derive(SimpleObject)]
struct TimelineMetadata {
    session_events: Option<i32>,
    emotion_entries: Option<i32>,
    physiological_entries: Option<i32>,
    total_data_points: Option<i32>,
    data_source: Option<String>,
    errors: Option<Vec<String>>,
    truncated: Option<bool>,
    original_size: Option<i32>,
}

#[derive(SimpleObject)]
struct TimelineResponse {
    timeline_data: Vec<TimelineDataPoint>,
    metadata: TimelineMetadata,
}

#[derive(SimpleObject)]
struct WordEmbedding {
    word: String,
    embedding: Vec<f64>,
}

#[derive(SimpleObject)]
struct Word2VecResponse {
    word_data: Vec<WordEmbedding>,
}

#[derive(SimpleObject)]
struct EmotionDistancePoint {
    x: f64,
    y: f64,
    z: Option<f64>,
    word: String,
    index: i32,
}

#[derive(SimpleObject)]
struct EmotionDistanceLink {
    source: i32,
    target: i32,
    value: f64,
}

#[derive(SimpleObject)]
struct EmotionDistanceVisualization {
    points: Vec<EmotionDistancePoint>,
    links: Vec<EmotionDistanceLink>,
}

#[derive(SimpleObject)]
struct DashboardStats {
    total_participants: i32,
    total_sessions: i32,
    total_responses: i32,
    average_spirit_probability: f64,
    emotion_distribution: serde_json::Value,
    component_averages: ComponentAverages,
}

#[derive(SimpleObject)]
struct ComponentAverages {
    word2vec: f64,
    reaction_time: f64,
    skin_potential: f64,
    emotion: f64,
}

#[derive(async_graphql::MergedObject, Default)]
pub struct Query(
    crate::activities::Query,
);

    async fn participants(&self, ctx: &Context<'_>) -> GQLResult<Vec<Participant>> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let db_participants = participants::table.load::<crate::models::Participant>(&mut conn).await?;
        
        // Convert database models to GraphQL types
        let gql_participants: Vec<Participant> = db_participants
            .into_iter()
            .map(|p| Participant {
                id: p.id.to_string(),
                age: p.age,
                gender: p.gender,
                handedness: p.handedness,
                created_at: p.created_at.to_rfc3339(),
                updated_at: p.updated_at.to_rfc3339(),
            })
            .collect();
        
        Ok(gql_participants)
    }

    async fn experiments(&self, ctx: &Context<'_>) -> GQLResult<Vec<Experiment>> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let experiments = experiments::table.load::<Experiment>(&mut conn).await?;
        Ok(experiments)
    }

    async fn windows(&self, ctx: &Context<'_>) -> GQLResult<Vec<Window>> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let windows = windows::table.load::<Window>(&mut conn).await?;
        Ok(windows)
    }

    async fn emotion_aggregations(&self, ctx: &Context<'_>) -> GQLResult<Vec<EmotionAggregation>> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let emotion_aggregations = emotion_aggregations::table.load::<EmotionAggregation>(&mut conn).await?;
        Ok(emotion_aggregations)
    }

    async fn physiological_aggregations(&self, ctx: &Context<'_>) -> GQLResult<Vec<PhysiologicalAggregation>> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let physiological_aggregations = physiological_aggregations::table.load::<PhysiologicalAggregation>(&mut conn).await?;
        Ok(physiological_aggregations)
    }

    async fn kernel_fusion_runs(&self, ctx: &Context<'_>) -> GQLResult<Vec<KernelFusionRun>> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let kernel_fusion_runs = kernel_fusion_runs::table.load::<KernelFusionRun>(&mut conn).await?;
        Ok(kernel_fusion_runs)
    }

    async fn embedding_results(&self, ctx: &Context<'_>) -> GQLResult<Vec<EmbeddingResult>> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let embedding_results = embedding_results::table.load::<EmbeddingResult>(&mut conn).await?;
        Ok(embedding_results)
    }

    async fn timeseries(&self, ctx: &Context<'_>, response_id: String) -> GQLResult<String> {
        // Placeholder for the timeseries data logic
        println!("[graphql] timeseries called for response {}", response_id);

        let mock_response = json!({
            "timestamps": [1, 2, 3],
            "skinPotential": [0.1, 0.2, 0.15],
            "emotions": [
                {"timestamp": 1, "joy": 0.9, "sadness": 0.1},
                {"timestamp": 2, "joy": 0.8, "sadness": 0.2},
                {"timestamp": 3, "joy": 0.85, "sadness": 0.15}
            ]
        });

        Ok(mock_response.to_string())
    }

    #[graphql(description="Get the status of a pipeline for a participant.")]
    async fn pipeline_status(&self, participant_id: String) -> Result<PipelineStatus, async_graphql::Error> {
        // Mock implementation
        Ok(PipelineStatus {
            participant_id,
            status: "running".to_string(),
            steps: PipelineStepStatus {
                file_import: "completed".to_string(),
                windows_generation: "running".to_string(),
                kernel_fusion: "pending".to_string(),
            },
            progress: 25,
            timestamp: chrono::Utc::now().to_rfc3339(),
        })
    }

    #[graphql(description="Get a single participant by ID.")]
    async fn participant(&self, ctx: &Context<'_>, participant_id: String) -> GQLResult<Participant> {
        use diesel::prelude::*;
        use uuid::Uuid;
        
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        
        // Parse participant_id as UUID
        let participant_uuid = Uuid::parse_str(&participant_id)
            .map_err(|e| async_graphql::Error::new(format!("Invalid participant_id: {}", e)))?;
        
        // Get participant from database
        let db_participant = participants::table
            .filter(participants::id.eq(participant_uuid))
            .first::<crate::models::Participant>(&mut conn)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Participant not found: {}", e)))?;
        
        // Convert to GraphQL type
        Ok(Participant {
            id: db_participant.id.to_string(),
            age: db_participant.age,
            gender: db_participant.gender,
            handedness: db_participant.handedness,
            created_at: db_participant.created_at.to_rfc3339(),
            updated_at: db_participant.updated_at.to_rfc3339(),
        })
    }

    #[graphql(description="Get timeline data for a participant.")]
    async fn participant_timeline(&self, ctx: &Context<'_>, participant_id: String) -> GQLResult<TimelineResponse> {
        use diesel::prelude::*;
        use uuid::Uuid;
        
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        
        // Parse participant_id as UUID
        let participant_uuid = Uuid::parse_str(&participant_id)
            .map_err(|e| async_graphql::Error::new(format!("Invalid participant_id: {}", e)))?;
        
        // Get sessions for this participant
        let sessions = participant_experiment_sessions::table
            .filter(participant_experiment_sessions::participant_id.eq(participant_uuid))
            .load::<ParticipantExperimentSession>(&mut conn)
            .await?;
        
        // Get response data for this participant
        let responses = participant_response_data::table
            .filter(participant_response_data::participant_id.eq(participant_uuid))
            .order(participant_response_data::timestamp.asc())
            .load::<ParticipantResponseData>(&mut conn)
            .await?;
        
        // Convert to timeline data points
        let mut timeline_data = Vec::new();
        let mut session_events_count = 0;
        let mut emotion_entries_count = 0;
        let mut physiological_entries_count = 0;
        
        // Add session start events
        for session in &sessions {
            session_events_count += 1;
            timeline_data.push(TimelineDataPoint {
                timestamp: session.start_time.timestamp_millis(),
                word: "SESSION_START".to_string(),
                reaction_time: 0,
                has_response: false,
                emotions: vec![],
                physiological: serde_json::json!({}),
                reaction_value: 0.0,
                event_type: Some("SessionStart".to_string()),
                metadata: Some(serde_json::json!({
                    "session_id": session.session_id.to_string(),
                    "session_type": session.session_type
                })),
            });
        }
        
        // Add response data points
        for response in &responses {
            let mut emotions = Vec::new();
            if let Some(emotion) = &response.emotion {
                emotion_entries_count += 1;
                emotions.push(EmotionData {
                    name: emotion.clone(),
                    score: response.emotion_confidence.unwrap_or(0.0) as f64,
                    file_type: "hume_ai".to_string(),
                });
            }
            
            if response.skin_potential.is_some() {
                physiological_entries_count += 1;
            }
            
            timeline_data.push(TimelineDataPoint {
                timestamp: response.timestamp.timestamp_millis(),
                word: response.stimulus_word.clone(),
                reaction_time: response.reaction_time_ms,
                has_response: true,
                emotions,
                physiological: serde_json::json!({
                    "average": response.skin_potential.unwrap_or(0.0),
                    "max": response.skin_potential.unwrap_or(0.0),
                    "min": response.skin_potential.unwrap_or(0.0)
                }),
                reaction_value: response.emotion_confidence.unwrap_or(0.0) as f64,
                event_type: Some("word_displayed".to_string()),
                metadata: Some(serde_json::json!({
                    "response_word": response.response_word,
                    "emotion_count": if response.emotion.is_some() { 1 } else { 0 },
                    "physiological_count": if response.skin_potential.is_some() { 1 } else { 0 }
                })),
            });
        }
        
        // Sort by timestamp
        timeline_data.sort_by_key(|d| d.timestamp);
        
        // Add session end events
        for session in &sessions {
            if let Some(end_time) = session.end_time {
                session_events_count += 1;
                timeline_data.push(TimelineDataPoint {
                    timestamp: end_time.timestamp_millis(),
                    word: "SESSION_END".to_string(),
                    reaction_time: 0,
                    has_response: false,
                    emotions: vec![],
                    physiological: serde_json::json!({}),
                    reaction_value: 0.0,
                    event_type: Some("SessionEnd".to_string()),
                    metadata: Some(serde_json::json!({
                        "session_id": session.session_id.to_string()
                    })),
                });
            }
        }
        
        Ok(TimelineResponse {
            timeline_data,
            metadata: TimelineMetadata {
                session_events: Some(session_events_count),
                emotion_entries: Some(emotion_entries_count),
                physiological_entries: Some(physiological_entries_count),
                total_data_points: Some(timeline_data.len() as i32),
                data_source: Some("postgresql".to_string()),
                errors: None,
                truncated: None,
                original_size: None,
            },
        })
    }
    
    #[graphql(description="Get Word2Vec embeddings for a participant.")]
    async fn participant_word2vec(&self, ctx: &Context<'_>, participant_id: String) -> GQLResult<Word2VecResponse> {
        use diesel::prelude::*;
        use uuid::Uuid;
        
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        
        // Parse participant_id as UUID
        let participant_uuid = Uuid::parse_str(&participant_id)
            .map_err(|e| async_graphql::Error::new(format!("Invalid participant_id: {}", e)))?;
        
        // Get analysis results which contain word2vec_component
        let analysis_results = participant_analysis_results::table
            .filter(participant_analysis_results::participant_id.eq(participant_uuid))
            .load::<ParticipantAnalysisResult>(&mut conn)
            .await?;
        
        // Group by word and calculate average embedding
        // For now, we'll use a simple approach: create embeddings from word2vec_component
        // In a real implementation, you'd have a separate embeddings table
        let mut word_embeddings_map: std::collections::HashMap<String, (Vec<f64>, i32)> = std::collections::HashMap::new();
        
        for result in &analysis_results {
            let word = result.stimulus_word.clone();
            if let Some(component) = result.word2vec_component {
                // Create a simple 1D embedding from the component
                // In production, you'd fetch actual Word2Vec vectors
                let embedding = vec![component as f64];
                let entry = word_embeddings_map.entry(word).or_insert_with(|| (vec![0.0], 0));
                if entry.0.len() == 1 {
                    entry.0[0] += embedding[0];
                } else {
                    entry.0 = embedding;
                }
                entry.1 += 1;
            }
        }
        
        let word_data: Vec<WordEmbedding> = word_embeddings_map
            .into_iter()
            .map(|(word, (sum, count))| {
                let avg_embedding = sum.iter().map(|&v| v / count as f64).collect();
                WordEmbedding {
                    word,
                    embedding: avg_embedding,
                }
            })
            .collect();
        
        Ok(Word2VecResponse { word_data })
    }
    
    #[graphql(description="Get dashboard statistics.")]
    async fn dashboard_stats(&self, ctx: &Context<'_>) -> GQLResult<DashboardStats> {
        use diesel::prelude::*;
        use diesel::dsl::*;
        
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        
        // Count participants
        let total_participants: i64 = participants::table
            .count()
            .get_result(&mut conn)
            .await?;
        
        // Count sessions
        let total_sessions: i64 = participant_experiment_sessions::table
            .count()
            .get_result(&mut conn)
            .await?;
        
        // Count responses
        let total_responses: i64 = participant_response_data::table
            .count()
            .get_result(&mut conn)
            .await?;
        
        // Calculate average spirit probability
        let avg_spirit: Option<f64> = participant_analysis_results::table
            .select(avg(participant_analysis_results::spirit_probability))
            .first(&mut conn)
            .await?;
        
        // Get emotion distribution
        let emotion_distribution: Vec<(Option<String>, i64)> = participant_response_data::table
            .select((participant_response_data::emotion, count_star()))
            .group_by(participant_response_data::emotion)
            .load(&mut conn)
            .await?;
        
        let mut emotion_dist_map = serde_json::Map::new();
        for (emotion, count) in emotion_distribution {
            if let Some(emotion) = emotion {
                emotion_dist_map.insert(emotion, serde_json::Value::Number(count.into()));
            }
        }
        
        // Calculate component averages
        let word2vec_avg: Option<f64> = participant_analysis_results::table
            .select(avg(participant_analysis_results::word2vec_component))
            .first(&mut conn)
            .await?;
        
        let reaction_time_avg: Option<f64> = participant_analysis_results::table
            .select(avg(participant_analysis_results::reaction_time_component))
            .first(&mut conn)
            .await?;
        
        let skin_potential_avg: Option<f64> = participant_analysis_results::table
            .select(avg(participant_analysis_results::skin_potential_component))
            .first(&mut conn)
            .await?;
        
        let emotion_avg: Option<f64> = participant_analysis_results::table
            .select(avg(participant_analysis_results::emotion_component))
            .first(&mut conn)
            .await?;
        
        Ok(DashboardStats {
            total_participants: total_participants as i32,
            total_sessions: total_sessions as i32,
            total_responses: total_responses as i32,
            average_spirit_probability: avg_spirit.unwrap_or(0.0),
            emotion_distribution: serde_json::Value::Object(emotion_dist_map),
            component_averages: ComponentAverages {
                word2vec: word2vec_avg.unwrap_or(0.0),
                reaction_time: reaction_time_avg.unwrap_or(0.0),
                skin_potential: skin_potential_avg.unwrap_or(0.0),
                emotion: emotion_avg.unwrap_or(0.0),
            },
        })
    }

    #[graphql(description="Get correlation data for a participant.")]
    async fn participant_correlation(&self, ctx: &Context<'_>, participant_id: String) -> Result<String, async_graphql::Error> {
        // Mock implementation
        let mock_correlation = serde_json::json!({
            "nodes": [ { "id": "joy" }, { "id": "reaction_time" } ],
            "links": [ { "source": "joy", "target": "reaction_time", "value": 0.6 } ]
        });
        Ok(serde_json::to_string(&mock_correlation)?)
    }

#[derive(async_graphql::MergedObject, Default)]
pub struct Mutation;

#[Object]
impl Mutation {
    async fn create_participant(&self, ctx: &Context<'_>, age: Option<i32>, gender: Option<String>, handedness: Option<String>) -> GQLResult<Participant> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let new_participant = NewParticipant {
            age,
            gender,
            handedness,
        };
        let participant = conn.build_transaction().run(|mut conn| {
            Box::pin(async move {
                diesel::insert_into(crate::schema::participants::table)
                    .values(&new_participant)
                    .returning(Participant::as_returning())
                    .get_result(&mut conn)
                    .await
            })
        }).await?;
        Ok(participant)
    }

    async fn create_experiment(&self, ctx: &Context<'_>, participant_id: uuid::Uuid) -> GQLResult<Experiment> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let new_experiment = NewExperiment {
            participant_id,
        };
        let experiment = conn.build_transaction().run(|mut conn| {
            Box::pin(async move {
                diesel::insert_into(crate::schema::experiments::table)
                    .values(&new_experiment)
                    .returning(Experiment::as_returning())
                    .get_result(&mut conn)
                    .await
            })
        }).await?;
        Ok(experiment)
    }

    async fn analyze_emotions(&self, ctx: &Context<'_>, video_file: String) -> GQLResult<Vec<EmotionAggregation>> {
        // This is a placeholder for the actual Hume AI API call
        // In a real implementation, you would use an HTTP client to call the Hume AI API
        // and then save the results to the database.
        let emotions = vec![
            NewEmotionAggregation {
                window_id: uuid::Uuid::new_v4(), // Placeholder
                source: "hume_ai".to_string(),
                emotion: "Joy".to_string(),
                score: 0.9,
            },
            NewEmotionAggregation {
                window_id: uuid::Uuid::new_v4(), // Placeholder
                source: "hume_ai".to_string(),
                emotion: "Sadness".to_string(),
                score: 0.1,
            },
        ];

        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let new_emotions = conn.build_transaction().run(|mut conn| {
            Box::pin(async move {
                diesel::insert_into(crate::schema::emotion_aggregations::table)
                    .values(&emotions)
                    .returning(EmotionAggregation::as_returning())
                    .get_results(&mut conn)
                    .await
            })
        }).await?;

        Ok(new_emotions)
    }

    async fn create_window(&self, ctx: &Context<'_>, input: NewWindow) -> GQLResult<Window> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let new_window = conn.build_transaction().run(|mut conn| {
            Box::pin(async move {
                let window = diesel::insert_into(windows::table)
                    .values(&input)
                    .returning(Window::as_returning())
                    .get_result(&mut conn)
                    .await?;
                Ok(window)
            })
        }).await?;
        Ok(new_window)
    }

    async fn create_emotion_aggregation(&self, ctx: &Context<'_>, input: NewEmotionAggregation) -> GQLResult<EmotionAggregation> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let new_emotion_aggregation = conn.build_transaction().run(|mut conn| {
            Box::pin(async move {
                let emotion_aggregation = diesel::insert_into(emotion_aggregations::table)
                    .values(&input)
                    .returning(EmotionAggregation::as_returning())
                    .get_result(&mut conn)
                    .await?;
                Ok(emotion_aggregation)
            })
        }).await?;
        Ok(new_emotion_aggregation)
    }

    async fn create_physiological_aggregation(&self, ctx: &Context<'_>, input: NewPhysiologicalAggregation) -> GQLResult<PhysiologicalAggregation> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let new_physiological_aggregation = conn.build_transaction().run(|mut conn| {
            Box::pin(async move {
                let physiological_aggregation = diesel::insert_into(physiological_aggregations::table)
                    .values(&input)
                    .returning(PhysiologicalAggregation::as_returning())
                    .get_result(&mut conn)
                    .await?;
                Ok(physiological_aggregation)
            })
        }).await?;
        Ok(new_physiological_aggregation)
    }

    async fn create_kernel_fusion_run(&self, ctx: &Context<'_>, input: NewKernelFusionRun) -> GQLResult<KernelFusionRun> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let new_kernel_fusion_run = conn.build_transaction().run(|mut conn| {
            Box::pin(async move {
                let kernel_fusion_run = diesel::insert_into(kernel_fusion_runs::table)
                    .values(&input)
                    .returning(KernelFusionRun::as_returning())
                    .get_result(&mut conn)
                    .await?;
                Ok(kernel_fusion_run)
            })
        }).await?;
        Ok(new_kernel_fusion_run)
    }

    async fn create_embedding_result(&self, ctx: &Context<'_>, input: NewEmbeddingResult) -> GQLResult<EmbeddingResult> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let new_embedding_result = conn.build_transaction().run(|mut conn| {
            Box::pin(async move {
                let embedding_result = diesel::insert_into(embedding_results::table)
                    .values(&input)
                    .returning(EmbeddingResult::as_returning())
                    .get_result(&mut conn)
                    .await?;
                Ok(embedding_result)
            })
        }).await?;
        Ok(new_embedding_result)
    }

    async fn calculate_emotion_distance(&self, ctx: &Context<'_>, input: EmotionDistanceInput) -> GQLResult<String> {
        // Placeholder implementation
        println!("[graphql] calculate_emotion_distance called for participant {}", input.participant_id);

        let mock_response = json!({
            "status": "completed",
            "participantId": input.participant_id,
            "experimentId": input.experiment_id,
            "method": input.method,
            "embeddingMethod": input.embedding_method,
            "message": "This is a mock response from the Rust GraphQL API."
        });

        Ok(mock_response.to_string())
    }

    async fn generate_windows(&self, ctx: &Context<'_>, input: WindowsGenerationInput) -> GQLResult<String> {
        // Placeholder for the windows generation logic
        println!("[graphql] generate_windows called for participant {}", input.participant_id);

        let mock_response = json!({
            "status": "completed",
            "participantId": input.participant_id,
            "windowsCount": 10, // Mock count
            "message": "This is a mock response from the Rust GraphQL API for windows generation."
        });

        Ok(mock_response.to_string())
    }

    async fn start_session(&self, ctx: &Context<'_>, participant_id: String, number_of_words: i32) -> GQLResult<String> {
        // This would trigger the session start logic
        Ok(format!("Session started for participant {} with {} words.", participant_id, number_of_words))
    }

    async fn record_word_response(&self, ctx: &Context<'_>, window_id: uuid::Uuid, response: models::WordResponse) -> GQLResult<models::WordResponse> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;

        let new_response = models::NewWordResponse {
            window_id,
            stimulus_word: response.stimulus_word.clone(),
            response_word: response.response_word.clone(),
            reaction_time_ms: response.reaction_time_ms,
            is_delayed: response.is_delayed,
        };

        let res = conn.build_transaction().run(|mut conn| {
            Box::pin(async move {
                let res = diesel::insert_into(word_responses::table)
                    .values(&new_response)
                    .returning(models::WordResponse::as_returning())
                    .get_result(&mut conn)
                    .await?;
                Ok(res)
            })
        }).await?;

        Ok(res)
    }

    async fn start_jung_test(&self, ctx: &Context<'_>, participant_id: String, number_of_words: i32) -> GQLResult<String> {
        match jung_test_activity(participant_id, number_of_words).await {
            Ok(_) => Ok("Jung test started successfully.".to_string()),
            Err(e) => Err(e.into()),
        }
    }

    async fn analyze_emotions_from_url(&self, ctx: &Context<'_>, participant_id: String, video_url: String) -> GQLResult<String> {
        match emotion_analysis_activity_from_url(participant_id, video_url).await {
            Ok(_) => Ok("Emotion analysis started successfully.".to_string()),
            Err(e) => Err(e.into()),
        }
    }

    #[graphql(description = "Seed Jung stimulus words into the database.")]
    async fn seed_jung_stimulus_words(&self, ctx: &Context<'_>) -> Result<i64, async_graphql::Error> {
        use crate::schema::word_stimuli;
        use crate::models::NewWordStimulus;
        use diesel::prelude::*;
        use diesel::upsert::excluded;

        let mut conn = ctx.data::<DbPool>()?.get()?;
        
        let words_to_insert: Vec<NewWordStimulus> = JUNG_STIMULUS_WORDS.iter().map(|(key, word)| {
            NewWordStimulus {
                id: &format!("jung_{}", key),
                word: word.japanese,
                language: "ja",
                pronunciation: word.pronunciation,
            }
        }).collect();

        let result = diesel::insert_into(word_stimuli::table)
            .values(&words_to_insert)
            .on_conflict(word_stimuli::id)
            .do_update()
            .set((
                word_stimuli::word.eq(excluded(word_stimuli::word)),
                word_stimuli::pronunciation.eq(excluded(word_stimuli::pronunciation)),
                word_stimuli::updated_at.eq(diesel::dsl::now),
            ))
            .execute(&mut conn)?;

        Ok(result as i64)
    }

    #[graphql(description = "Calculate emotion distance and generate visualization.")]
    async fn calculate_emotion_distance(&self, ctx: &Context<'_>, input: CalculateEmotionDistanceInput) -> GQLResult<EmotionDistanceVisualization> {
        use diesel::prelude::*;
        use uuid::Uuid;

        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;

        // Parse participant_id as UUID
        let participant_uuid = Uuid::parse_str(&input.participant_id)
            .map_err(|e| async_graphql::Error::new(format!("Invalid participant_id: {}", e)))?;

        // Get emotion data for the participant
        let emotion_data: Vec<(Option<String>, Option<f64>, i32)> = participant_response_data::table
            .filter(participant_response_data::participant_id.eq(participant_uuid))
            .filter(participant_response_data::emotion.is_not_null())
            .filter(participant_response_data::emotion_confidence.is_not_null())
            .select((
                participant_response_data::emotion,
                participant_response_data::emotion_confidence,
                participant_response_data::word_stimulus_id,
            ))
            .load(&mut conn)
            .await?;

        if emotion_data.is_empty() {
            return Err(async_graphql::Error::new("No emotion data found for participant"));
        }

        // Group emotions by type and calculate average confidence
        let mut emotion_map: std::collections::HashMap<String, (f64, i32)> = std::collections::HashMap::new();

        for (emotion, confidence, _) in emotion_data {
            if let (Some(emotion_name), Some(conf)) = (emotion, confidence) {
                let entry = emotion_map.entry(emotion_name).or_insert((0.0, 0));
                entry.0 += conf;
                entry.1 += 1;
            }
        }

        // Calculate average confidence for each emotion
        let mut emotion_vectors: Vec<(String, f64)> = emotion_map
            .into_iter()
            .map(|(emotion, (sum, count))| (emotion, sum / count as f64))
            .collect();

        // Filter top K emotions if specified
        if let Some(top_k) = &input.top_k_emotions {
            if !top_k.is_empty() {
                emotion_vectors.retain(|(emotion, _)| top_k.contains(emotion));
            }
        }

        // Sort by confidence for consistent ordering
        emotion_vectors.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        // Limit to top emotions for better visualization
        let max_emotions = input.k.unwrap_or(10) as usize;
        emotion_vectors.truncate(max_emotions);

        if emotion_vectors.len() < 2 {
            return Err(async_graphql::Error::new("Need at least 2 emotions for distance calculation"));
        }

        // Create simple 2D embedding (circular layout for demonstration)
        // In production, you'd use PCA, t-SNE, or other dimensionality reduction
        let num_emotions = emotion_vectors.len();
        let mut points = Vec::new();
        let mut links = Vec::new();

        // Calculate center and radius for circular layout
        let center_x = 0.0;
        let center_y = 0.0;
        let radius = 100.0;

        for (i, (emotion, confidence)) in emotion_vectors.iter().enumerate() {
            // Circular positioning
            let angle = (i as f64 * 2.0 * std::f64::consts::PI) / num_emotions as f64;
            let x = center_x + radius * angle.cos();
            let y = center_y + radius * angle.sin();

            points.push(EmotionDistancePoint {
                x,
                y,
                z: None, // 2D for now
                word: emotion.clone(),
                index: i as i32,
            });
        }

        // Calculate distances between all emotion pairs
        let distance_method = input.method.as_deref().unwrap_or("euclidean");

        for i in 0..num_emotions {
            for j in (i + 1)..num_emotions {
                let point_i = &points[i];
                let point_j = &points[j];

                let distance = match distance_method {
                    "euclidean" => {
                        let dx = point_i.x - point_j.x;
                        let dy = point_i.y - point_j.y;
                        (dx * dx + dy * dy).sqrt()
                    },
                    "cosine" => {
                        // For cosine distance, we'd need actual vectors
                        // For now, use normalized euclidean distance as approximation
                        let dx = point_i.x - point_j.x;
                        let dy = point_i.y - point_j.y;
                        let dist = (dx * dx + dy * dy).sqrt();
                        // Normalize by maximum possible distance
                        dist / (2.0 * radius)
                    },
                    _ => {
                        let dx = point_i.x - point_j.x;
                        let dy = point_i.y - point_j.y;
                        (dx * dx + dy * dy).sqrt()
                    }
                };

                links.push(EmotionDistanceLink {
                    source: i as i32,
                    target: j as i32,
                    value: (1.0 - distance / (2.0 * radius)).max(0.0), // Normalize to 0-1
                });
            }
        }

        Ok(EmotionDistanceVisualization { points, links })
    }
}

pub type Schema = async_graphql::Schema<Query, Mutation, EmptySubscription>;

pub async fn create_schema(pool: Arc<Pool<NoTls>>) -> Schema {
    Schema::build(Query, Mutation, EmptySubscription)
        .data(pool)
        .finish()
}

type GraphQLSchema = Schema<Query, EmptyMutation, EmptySubscription>;

#[tokio::main]
async fn main() {
    dotenv().ok();

    let pool = Arc::new(establish_connection());
    let schema = Schema::build(Query, EmptyMutation, EmptySubscription)
        .data(pool.clone())
        .finish();

    let graphql_post = graphql(schema)
        .and_then(|(schema, request): (GraphQLSchema, async_graphql::Request)| async move {
            Ok::<_, Infallible>(warp::reply::json(&schema.execute(request).await))
        });

    let graphql_playground = warp::path::end().map(|| {
        warp::reply::html(playground_source(GraphQLPlaygroundConfig::new("/graphql")))
    });

    let routes = graphql_playground
        .or(warp::path("graphql").and(graphql_post));

    println!("GraphQL server running on http://localhost:8080");
    println!("GraphiQL playground available at http://localhost:8080");

    warp::serve(routes).run(([0, 0, 0, 0], 8080)).await;
}
