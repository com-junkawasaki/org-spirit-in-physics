
use async_graphql::{Context, Object, Result as GQLResult, SimpleObject, InputObject};
use diesel::prelude::*;
use diesel_async::RunQueryDsl;
use std::sync::Arc;
use diesel_async::{AsyncPgConnection, pooled_connection::deadpool::Pool};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde_json;

use crate::models::*;
use crate::db::schema::*;

// GraphQL Types - Participant moved to models.rs as ParticipantGQL

#[derive(SimpleObject)]
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

#[derive(SimpleObject)]
#[graphql(name = "EmotionData")]
pub struct EmotionData {
    pub name: String,
    pub score: f64,
    #[graphql(name = "fileType")]
    pub file_type: String,
}

#[derive(SimpleObject)]
#[graphql(name = "PhysiologicalData")]
pub struct PhysiologicalData {
    pub average: Option<f64>,
    pub max: Option<f64>,
    pub min: Option<f64>,
}

#[derive(SimpleObject)]
#[graphql(name = "TimelineDataPointMetadata")]
pub struct TimelineDataPointMetadata {
    #[graphql(name = "emotionCount")]
    pub emotion_count: Option<i32>,
    #[graphql(name = "physiologicalCount")]
    pub physiological_count: Option<i32>,
}

#[derive(SimpleObject)]
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

        let gql_participants: Vec<ParticipantGQL> = db_participants
            .into_iter()
            .map(|(id, age, handedness, created_at, updated_at)| ParticipantGQL {
                id: id.to_string(),
                age,
                gender: None, // GenderType enum conversion skipped for now
                handedness,
                created_at: created_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
                updated_at: updated_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
            })
            .collect();

        Ok(gql_participants)
    }

    // async fn participant(&self, ctx: &Context<'_>, participant_id: String) -> GQLResult<Participant> {
    //     Ok(Participant {
    //         id: "test".to_string(),
    //         age: None,
    //         gender: None,
    //         handedness: None,
    //         created_at: "2024-01-01T00:00:00Z".to_string(),
    //         updated_at: "2024-01-01T00:00:00Z".to_string(),
    //     })
    // }

    #[graphql(name = "participantTimeline")]
    async fn participant_timeline(&self, ctx: &Context<'_>, participant_id: String) -> GQLResult<ParticipantTimelineResponse> {
        let pool = ctx.data::<Arc<Pool<AsyncPgConnection>>>()?;
        let mut conn = pool.get().await?;
        
        let participant_uuid = Uuid::parse_str(&participant_id)
            .map_err(|e| async_graphql::Error::new(format!("Invalid participant ID: {}", e)))?;
        
        // Fetch participant response data
        let responses: Vec<(uuid::Uuid, String, Option<String>, i32, chrono::DateTime<chrono::Utc>, Option<rust_decimal::Decimal>, Option<String>, Option<rust_decimal::Decimal>)> = 
            participant_response_data::table
                .filter(participant_response_data::participant_id.eq(participant_uuid))
                .select((
                    participant_response_data::id,
                    participant_response_data::stimulus_word,
                    participant_response_data::response_word,
                    participant_response_data::reaction_time_ms,
                    participant_response_data::timestamp,
                    participant_response_data::skin_potential,
                    participant_response_data::emotion,
                    participant_response_data::emotion_confidence,
                ))
                .order(participant_response_data::timestamp.asc())
                .load(&mut conn)
                .await?;
        
        // Convert to TimelineDataPoint
        let timeline_data: Vec<TimelineDataPoint> = responses.into_iter().enumerate().map(|(idx, (id, stimulus_word, response_word, reaction_time_ms, timestamp, skin_potential, emotion, emotion_confidence))| {
            let timestamp_float = timestamp.timestamp_millis() as f64;
            
            // Parse emotion data (simplified - in production, query emotion_data table)
            let emotions = if let Some(emotion_name) = emotion {
                vec![EmotionData {
                    name: emotion_name,
                    score: emotion_confidence.and_then(|c| c.to_f64()).unwrap_or(0.0),
                    file_type: "hume_json".to_string(),
                }]
            } else {
                vec![]
            };
            
            // Parse physiological data
            let physiological = PhysiologicalData {
                average: skin_potential.and_then(|s| s.to_f64()),
                max: skin_potential.and_then(|s| s.to_f64()),
                min: skin_potential.and_then(|s| s.to_f64()),
            };
            
            TimelineDataPoint {
                timestamp: timestamp_float,
                word: stimulus_word.clone(),
                reaction_time: reaction_time_ms as i32,
                has_response: response_word.is_some(),
                emotions,
                physiological,
                reaction_value: if response_word.is_some() { 1.0 } else { 0.0 },
                event_type: Some("word_response".to_string()),
                metadata: Some(TimelineDataPointMetadata {
                    emotion_count: if emotion.is_some() { Some(1) } else { Some(0) },
                    physiological_count: if skin_potential.is_some() { Some(1) } else { Some(0) },
                }),
            }
        }).collect();
        
        Ok(ParticipantTimelineResponse {
            timeline_data,
            metadata: TimelineMetadata {
                session_events: None,
                emotion_entries: Some(timeline_data.iter().map(|d| d.emotions.len() as i32).sum()),
                physiological_entries: Some(timeline_data.iter().filter(|d| d.physiological.average.is_some()).count() as i32),
                total_data_points: Some(timeline_data.len() as i32),
                data_source: Some("database".to_string()),
                errors: None,
                truncated: None,
                original_size: Some(timeline_data.len() as i32),
            },
        })
    }

    #[graphql(name = "participantWord2Vec")]
    async fn participant_word2vec(&self, ctx: &Context<'_>, participant_id: String) -> GQLResult<ParticipantWord2VecResponse> {
        // Placeholder implementation - would need word2vec embeddings from database or external service
        Ok(ParticipantWord2VecResponse { 
            word_data: vec![] 
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
        name: None,
        ethnicity: None,
        income: None,
        consent_version: None,
        study_id: None,
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
                name: None,
                ethnicity: None,
                income: None,
                consent_version: None,
                study_id: None,
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
        name: None,
        ethnicity: None,
        income: None,
        consent_version: None,
        study_id: None,
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
                name: None,
                ethnicity: None,
                income: None,
                consent_version: None,
                study_id: None,
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
