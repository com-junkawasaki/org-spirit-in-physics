use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Queryable, Serialize, Deserialize)]
pub struct Participant {
    pub id: Uuid,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub handedness: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = participants)]
pub struct NewParticipant {
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub handedness: Option<String>,
}

#[derive(Queryable, Serialize, Deserialize)]
pub struct Experiment {
    pub id: Uuid,
    pub participant_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = experiments)]
pub struct NewExperiment {
    pub participant_id: Uuid,
}

#[derive(Queryable, Serialize, Deserialize)]
pub struct Window {
    pub id: Uuid,
    pub experiment_id: Uuid,
    pub word: String,
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
    pub reaction_time_ms: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = windows)]
pub struct NewWindow {
    pub experiment_id: Uuid,
    pub word: String,
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
    pub reaction_time_ms: Option<i32>,
}

#[derive(Queryable, Serialize, Deserialize)]
pub struct EmotionAggregation {
    pub id: Uuid,
    pub window_id: Uuid,
    pub source: String,
    pub emotion: String,
    pub score: f64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = emotion_aggregations)]
pub struct NewEmotionAggregation {
    pub window_id: Uuid,
    pub source: String,
    pub emotion: String,
    pub score: f64,
}

#[derive(Queryable, Serialize, Deserialize)]
pub struct PhysiologicalAggregation {
    pub id: Uuid,
    pub window_id: Uuid,
    pub channels: serde_json::Value,
    pub avg: Option<f64>,
    pub quality: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = physiological_aggregations)]
pub struct NewPhysiologicalAggregation {
    pub window_id: Uuid,
    pub channels: serde_json::Value,
    pub avg: Option<f64>,
    pub quality: Option<f64>,
}

#[derive(Queryable, Serialize, Deserialize)]
pub struct KernelFusionRun {
    pub id: Uuid,
    pub participant_id: Uuid,
    pub weights: serde_json::Value,
    pub normalization: Option<String>,
    pub dimensions: i32,
    pub timestamp: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = kernel_fusion_runs)]
pub struct NewKernelFusionRun {
    pub participant_id: Uuid,
    pub weights: serde_json::Value,
    pub normalization: Option<String>,
    pub dimensions: i32,
    pub timestamp: DateTime<Utc>,
}

#[derive(Queryable, Serialize, Deserialize)]
pub struct EmbeddingResult {
    pub id: Uuid,
    pub kernel_fusion_run_id: Uuid,
    pub method: String,
    pub dimensions: i32,
    pub points: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = embedding_results)]
pub struct NewEmbeddingResult {
    pub kernel_fusion_run_id: Uuid,
    pub method: String,
    pub dimensions: i32,
    pub points: serde_json::Value,
}

#[derive(SimpleObject, Debug, Clone, Serialize, Deserialize, InputObject)]
#[graphql(input_name = "WordResponseInput")]
pub struct WordResponse {
    pub stimulus_word: String,
    pub response_word: String,
    pub reaction_time_ms: i32,
    pub is_delayed: Option<bool>,
}

#[derive(Insertable, Debug, Serialize, Deserialize)]
#[diesel(table_name = word_responses)]
pub struct NewWordResponse {
    pub window_id: Uuid,
    pub stimulus_word: String,
    pub response_word: String,
    pub reaction_time_ms: i32,
    pub is_delayed: Option<bool>,
}

#[derive(Queryable, SimpleObject, Debug, Clone)]
#[graphql(name = "WordStimulus")]
pub struct WordStimulus {
    pub id: String,
    pub word: String,
    pub language: String,
    pub pronunciation: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = word_stimuli)]
pub struct NewWordStimulus<'a> {
    pub id: &'a str,
    pub word: &'a str,
    pub language: &'a str,
    pub pronunciation: &'a str,
}

