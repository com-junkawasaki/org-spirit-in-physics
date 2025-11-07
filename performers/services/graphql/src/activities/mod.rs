
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
pub struct EmotionData {
    pub name: String,
    pub score: f64,
    pub file_type: String,
}

#[derive(SimpleObject)]
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

#[derive(SimpleObject)]
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

#[derive(SimpleObject)]
pub struct TimelineResponse {
    pub timeline_data: Vec<TimelineDataPoint>,
    pub metadata: TimelineMetadata,
}

#[derive(SimpleObject)]
pub struct WordEmbedding {
    pub word: String,
    pub embedding: Vec<f64>,
}

#[derive(SimpleObject)]
pub struct Word2VecResponse {
    pub word_data: Vec<WordEmbedding>,
}

#[derive(SimpleObject)]
pub struct EmotionDistancePoint {
    pub x: f64,
    pub y: f64,
    pub z: Option<f64>,
    pub word: String,
    pub index: i32,
}

#[derive(SimpleObject)]
pub struct EmotionDistanceLink {
    pub source: i32,
    pub target: i32,
    pub value: f64,
}

#[derive(SimpleObject)]
pub struct EmotionDistanceVisualization {
    pub points: Vec<EmotionDistancePoint>,
    pub links: Vec<EmotionDistanceLink>,
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
pub struct CalculateEmotionDistanceInput {
    pub participant_id: String,
    pub experiment_id: String,
    pub method: String,
    pub embedding_method: String,
    pub dimensions: i32,
    pub k: i32,
    pub gamma: f64,
    pub alpha: f64,
    pub top_k_emotions: i32,
}

#[derive(Default)]
pub struct Query;

#[Object]
impl Query {
    async fn participants(&self, ctx: &Context<'_>) -> GQLResult<Vec<ParticipantGQL>> {
        let pool = ctx.data::<Arc<Pool<AsyncPgConnection>>>()?;
        let mut conn = pool.get().await?;
        let db_participants = participants::table.load::<crate::models::Participant>(&mut conn).await?;

        let gql_participants: Vec<ParticipantGQL> = db_participants
            .into_iter()
            .map(|p| ParticipantGQL {
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

    // async fn participant_timeline(&self, ctx: &Context<'_>, participant_id: String) -> GQLResult<TimelineResponse> {
    //     Ok(TimelineResponse {
    //         timeline_data: vec![],
    //         metadata: TimelineMetadata {
    //             session_events: None,
    //             emotion_entries: None,
    //             physiological_entries: None,
    //             total_data_points: None,
    //             data_source: None,
    //             errors: None,
    //             truncated: None,
    //             original_size: None,
    //         },
    //     })
    // }

    // async fn participant_word2vec(&self, ctx: &Context<'_>, participant_id: String) -> GQLResult<Word2VecResponse> {
    //     Ok(Word2VecResponse { word_data: vec![] })
    // }

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
    // Temporarily disabled for compilation
    // async fn calculate_emotion_distance(&self, ctx: &Context<'_>, input: CalculateEmotionDistanceInput) -> GQLResult<EmotionDistanceVisualization> {
    //     // Simple mock implementation for emotion distance calculation
    //     let points = vec![
    //         EmotionDistancePoint {
    //             x: 1.0,
    //             y: 2.0,
    //             z: Some(3.0),
    //             word: "test".to_string(),
    //             index: 0,
    //         }
    //     ];

    //     let links = vec![
    //         EmotionDistanceLink {
    //             source: 0,
    //             target: 1,
    //             value: 0.5,
    //         }
    //     ];

    //     Ok(EmotionDistanceVisualization {
    //         points,
    //         links,
    //     })
    // }
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
        gender: None,
        handedness: None,
    };
    let participant = conn.build_transaction().run(|mut conn| {
        Box::pin(async move {
            let participant = diesel::insert_into(crate::db::schema::participants::table)
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
            let experiment = diesel::insert_into(crate::db::schema::experiments::table)
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
    pool: Arc<Pool<AsyncPgConnection>>,
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
            let window = diesel::insert_into(crate::db::schema::windows::table)
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
    pool: Arc<Pool<AsyncPgConnection>>,
    participant_id: uuid::Uuid,
    distances: Vec<String>,
    options: serde_json::Value,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut conn = pool.get().await?;

    // 核融合実行作成
    let new_kernel_fusion_run = NewKernelFusionRun {
        participant_id,
        weights: options.to_string(),
        normalization: Some("trace".to_string()),
        dimensions: 3,
        timestamp: chrono::Utc::now(),
    };
    let kernel_fusion_run = conn.build_transaction().run(|mut conn| {
        Box::pin(async move {
            let kernel_fusion_run = diesel::insert_into(crate::db::schema::kernel_fusion_runs::table)
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
        points: serde_json::json!([ [0.1, 0.2, 0.3], [0.4, 0.5, 0.6] ]).to_string(), // 簡易データ
    };
    let _embedding = conn.build_transaction().run(|mut conn| {
        Box::pin(async move {
            let embedding_result = diesel::insert_into(crate::db::schema::embedding_results::table)
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
        gender: Some("male".to_string()),
        handedness: Some("right".to_string()),
    };
    conn.build_transaction().run(|mut conn| {
        Box::pin(async move {
            diesel::insert_into(crate::db::schema::participants::table)
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
            diesel::insert_into(crate::db::schema::emotion_aggregations::table)
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
