
use async_graphql::{Context, Object, Result as GQLResult};
use diesel::prelude::*;
use diesel_async::RunQueryDsl;
use std::sync::Arc;
use tokio_postgres::NoTls;
use diesel_async::pooled_connection::deadpool::Pool;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde_json;

use crate::models::*;
use crate::schema::*;

// GraphQL Types
#[derive(async_graphql::SimpleObject)]
pub struct Participant {
    pub id: String,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub handedness: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(async_graphql::SimpleObject)]
pub struct EmotionData {
    pub name: String,
    pub score: f64,
    pub file_type: String,
}

#[derive(async_graphql::SimpleObject)]
pub struct TimelineDataPoint {
    pub timestamp: i64,
    pub word: String,
    pub reaction_time: i32,
    pub has_response: bool,
    pub emotions: Vec<EmotionData>,
    pub physiological: serde_json::Value,
    pub reaction_value: f64,
    pub event_type: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(async_graphql::SimpleObject)]
pub struct TimelineMetadata {
    pub session_events: Option<i32>,
    pub emotion_entries: Option<i32>,
    pub physiological_entries: Option<i32>,
    pub total_data_points: Option<i32>,
    pub data_source: Option<String>,
    pub errors: Option<Vec<String>>,
    pub truncated: Option<bool>,
    pub original_size: Option<i32>,
}

#[derive(async_graphql::SimpleObject)]
pub struct TimelineResponse {
    pub timeline_data: Vec<TimelineDataPoint>,
    pub metadata: TimelineMetadata,
}

#[derive(async_graphql::SimpleObject)]
pub struct WordEmbedding {
    pub word: String,
    pub embedding: Vec<f64>,
}

#[derive(async_graphql::SimpleObject)]
pub struct Word2VecResponse {
    pub word_data: Vec<WordEmbedding>,
}

#[derive(async_graphql::SimpleObject)]
pub struct EmotionDistancePoint {
    pub x: f64,
    pub y: f64,
    pub z: Option<f64>,
    pub word: String,
    pub index: i32,
}

#[derive(async_graphql::SimpleObject)]
pub struct EmotionDistanceLink {
    pub source: i32,
    pub target: i32,
    pub value: f64,
}

#[derive(async_graphql::SimpleObject)]
pub struct EmotionDistanceVisualization {
    pub points: Vec<EmotionDistancePoint>,
    pub links: Vec<EmotionDistanceLink>,
}

#[derive(async_graphql::SimpleObject)]
pub struct DashboardStats {
    pub total_participants: i32,
    pub total_sessions: i32,
    pub total_responses: i32,
    pub average_spirit_probability: f64,
    pub emotion_distribution: serde_json::Value,
    pub component_averages: ComponentAverages,
}

#[derive(async_graphql::SimpleObject)]
pub struct ComponentAverages {
    pub word2vec: f64,
    pub reaction_time: f64,
    pub skin_potential: f64,
    pub emotion: f64,
}

#[derive(Default)]
pub struct Query;

#[Object]
impl Query {
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

    #[graphql(description="Get a single participant by ID.")]
    async fn participant(&self, ctx: &Context<'_>, participant_id: String) -> GQLResult<Participant> {
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
}

// ファイルインポートアクティビティ
pub async fn import_file_activity(
    pool: Arc<Pool<NoTls>>,
    participant_id: uuid::Uuid,
    data_root_path: String,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut conn = pool.get().await?;
    
    // 参加者作成
    let new_participant = NewParticipant {
        age: None,
        gender: None,
        handedness: None,
    };
    let participant = conn.build_transaction().run(|mut conn| {
        Box::pin(async move {
            let participant = diesel::insert_into(crate::schema::participants::table)
                .values(&new_participant)
                .returning(crate::models::Participant::as_returning())
                .get_result(&mut conn)
                .await?;
            Ok(participant)
        })
    }).await?;

    // 実験作成
    let new_experiment = NewExperiment {
        participant_id: participant.id,
    };
    let experiment = conn.build_transaction().run(|mut conn| {
        Box::pin(async move {
            let experiment = diesel::insert_into(crate::schema::experiments::table)
                .values(&new_experiment)
                .returning(crate::models::Experiment::as_returning())
                .get_result(&mut conn)
                .await?;
            Ok(experiment)
        })
    }).await?;

    // ファイル処理ロジック（簡易版）
    // 実際にはファイル読み込みと検証を行う
    println!("File import activity for participant {} completed", participant_id);

    Ok(())
}

// ウィンドウ生成アクティビティ
pub async fn generate_windows_activity(
    pool: Arc<Pool<NoTls>>,
    experiment_id: uuid::Uuid,
    session_uri: String,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut conn = pool.get().await?;
    
    // ウィンドウ作成
    let new_window = NewWindow {
        experiment_id,
        word: "sample_word".to_string(),
        start: chrono::Utc::now(),
        end: chrono::Utc::now(),
        reaction_time_ms: None,
    };
    let _window = conn.build_transaction().run(|mut conn| {
        Box::pin(async move {
            let window = diesel::insert_into(crate::schema::windows::table)
                .values(&new_window)
                .returning(crate::models::Window::as_returning())
                .get_result(&mut conn)
                .await?;
            Ok(window)
        })
    }).await?;

    println!("Windows generation activity for experiment {} completed", experiment_id);

    Ok(())
}

// 核融合アクティビティ
pub async fn kernel_fusion_activity(
    pool: Arc<Pool<NoTls>>,
    participant_id: uuid::Uuid,
    distances: Vec<String>,
    options: serde_json::Value,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut conn = pool.get().await?;
    
    // 核融合実行作成
    let new_kernel_fusion_run = NewKernelFusionRun {
        participant_id,
        weights: options,
        normalization: Some("trace".to_string()),
        dimensions: 3,
        timestamp: chrono::Utc::now(),
    };
    let kernel_fusion_run = conn.build_transaction().run(|mut conn| {
        Box::pin(async move {
            let kernel_fusion_run = diesel::insert_into(crate::schema::kernel_fusion_runs::table)
                .values(&new_kernel_fusion_run)
                .returning(crate::models::KernelFusionRun::as_returning())
                .get_result(&mut conn)
                .await?;
            Ok(kernel_fusion_run)
        })
    }).await?;

    // 埋め込み結果作成
    let new_embedding_result = NewEmbeddingResult {
        kernel_fusion_run_id: kernel_fusion_run.id,
        method: "kernel_fusion".to_string(),
        dimensions: 3,
        points: serde_json::json!([ [0.1, 0.2, 0.3], [0.4, 0.5, 0.6] ]), // 簡易データ
    };
    let _embedding = conn.build_transaction().run(|mut conn| {
        Box::pin(async move {
            let embedding_result = diesel::insert_into(crate::schema::embedding_results::table)
                .values(&new_embedding_result)
                .returning(crate::models::EmbeddingResult::as_returning())
                .get_result(&mut conn)
                .await?;
            Ok(embedding_result)
        })
    }).await?;

    println!("Kernel fusion activity for participant {} completed", participant_id);

    Ok(())
}

// データローディングとインポートアクティビティ
pub async fn import_data_activity(
    pool: Arc<Pool<NoTls>>,
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
        gender: Some("male".to_string()),
        handedness: Some("right".to_string()),
    };
    conn.build_transaction().run(|mut conn| {
        Box::pin(async move {
            diesel::insert_into(crate::schema::participants::table)
                .values(&new_participant)
                .execute(&mut conn)
                .await
        })
    }).await?;

    println!("Data import activity for participant {} completed", participant_id);

    Ok(())
}

// 感情分析アクティビティ
pub async fn emotion_analysis_activity(
    pool: Arc<Pool<NoTls>>,
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

    // 感情データをデータベースに保存
    let mut conn = pool.get().await?;
    let new_emotion = NewEmotionAggregation {
        window_id: uuid::Uuid::new_v4(), // Placeholder
        source: "hume_ai".to_string(),
        emotion: "Joy".to_string(), // 簡易データ
        score: 0.9,
    };
    conn.build_transaction().run(|mut conn| {
        Box::pin(async move {
            diesel::insert_into(crate::schema::emotion_aggregations::table)
                .values(&new_emotion)
                .execute(&mut conn)
                .await
        })
    }).await?;

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
