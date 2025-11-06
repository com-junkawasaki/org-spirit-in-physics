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

use crate::models::{Participant, NewParticipant, Experiment, NewExperiment, Window, NewWindow, EmotionAggregation, NewEmotionAggregation, PhysiologicalAggregation, NewPhysiologicalAggregation, KernelFusionRun, NewKernelFusionRun, EmbeddingResult, NewEmbeddingResult};

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

pub struct Query;

#[Object]
impl Query {
    async fn participants(&self, ctx: &Context<'_>) -> GQLResult<Vec<Participant>> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let participants = participants::table.load::<Participant>(&mut conn).await?;
        Ok(participants)
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
    async fn participant(&self, ctx: &Context<'_>, participant_id: String) -> Result<String, async_graphql::Error> {
        // This should query the database for a single participant
        // For now, returning a mock JSON string
        let mock_participant = serde_json::json!({
            "id": participant_id,
            "name": format!("Participant {}", participant_id),
            "sessionCount": 2,
            "responseCount": 200,
            "averageSpiritProbability": 0.78,
            "lastActivity": "2025-11-06T10:00:00Z"
        });
        Ok(serde_json::to_string(&mock_participant)?)
    }

    #[graphql(description="Get timeline data for a participant.")]
    async fn participant_timeline(&self, ctx: &Context<'_>, participant_id: String) -> Result<String, async_graphql::Error> {
        // Mock implementation
        let mock_timeline = serde_json::json!([
            { "type": "SessionStart", "timestamp": "2025-11-01T10:00:00Z", "details": "Session 1" },
            { "type": "Response", "timestamp": "2025-11-01T10:05:00Z", "details": "Word: 'Sky', Response: 'Blue'" },
            { "type": "SessionEnd", "timestamp": "2025-11-01T10:30:00Z", "details": "Session 1" }
        ]);
        Ok(serde_json::to_string(&mock_timeline)?)
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
}

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
