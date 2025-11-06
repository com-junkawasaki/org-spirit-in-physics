
use async_graphql::Context;
use diesel::prelude::*;
use diesel_async::RunQueryDsl;
use std::sync::Arc;
use tokio_postgres::NoTls;
use diesel_async::pooled_connection::deadpool::Pool;

use crate::models::{NewParticipant, NewExperiment, NewWindow, NewEmotionAggregation, NewPhysiologicalAggregation, NewKernelFusionRun, NewEmbeddingResult};

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
