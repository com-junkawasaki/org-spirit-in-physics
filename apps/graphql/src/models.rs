use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use async_graphql::{SimpleObject, InputObject};
// JsonValue changed to String for compatibility

// Existing models
#[derive(Queryable, Selectable, Serialize, Deserialize)]
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

// New models for Supabase schema
#[derive(Queryable, Selectable, Serialize, Deserialize)]
pub struct ParticipantConsent {
    pub id: Uuid,
    pub participant_id: Uuid,
    pub signature: String,
    pub agreements: String, // JSON as string
    pub agreed_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = participant_consents)]
pub struct NewParticipantConsent {
    pub participant_id: Uuid,
    pub signature: String,
    pub agreements: String, // JSON as string
    pub agreed_at: DateTime<Utc>,
}

#[derive(Queryable, Selectable, Serialize, Deserialize)]
pub struct ParticipantExperimentSession {
    pub id: Uuid,
    pub participant_id: Uuid,
    pub session_id: Uuid,
    pub session_type: String, // session_type enum
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = participant_experiment_sessions)]
pub struct NewParticipantExperimentSession {
    pub participant_id: Uuid,
    pub session_id: Uuid,
    pub session_type: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
}

#[derive(Queryable, Selectable, Serialize, Deserialize)]
pub struct ParticipantResponseData {
    pub id: Uuid,
    pub participant_id: Uuid,
    pub experiment_id: Uuid,
    pub word_stimulus_id: i32,
    pub stimulus_word: String,
    pub response_word: String,
    pub reaction_time_ms: i32,
    pub session: String, // session_type enum
    pub timestamp: DateTime<Utc>,
    pub audio_file_path: Option<String>,
    pub video_file_path: Option<String>,
    pub skin_potential: Option<f64>,
    pub emotion: Option<String>,
    pub emotion_confidence: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = participant_response_data)]
pub struct NewParticipantResponseData {
    pub participant_id: Uuid,
    pub experiment_id: Uuid,
    pub word_stimulus_id: i32,
    pub stimulus_word: String,
    pub response_word: String,
    pub reaction_time_ms: i32,
    pub session: String,
    pub timestamp: DateTime<Utc>,
    pub audio_file_path: Option<String>,
    pub video_file_path: Option<String>,
    pub skin_potential: Option<f64>,
    pub emotion: Option<String>,
    pub emotion_confidence: Option<f64>,
}

#[derive(Queryable, Selectable, Serialize, Deserialize)]
pub struct ParticipantAnalysisResult {
    pub id: Uuid,
    pub participant_id: Uuid,
    pub experiment_id: Uuid,
    pub word_stimulus_id: i32,
    pub stimulus_word: String,
    pub response_word: String,
    pub reaction_time_ms: Option<i32>,
    pub spirit_probability: f64,
    pub word2vec_component: Option<f64>,
    pub reaction_time_component: Option<f64>,
    pub skin_potential_component: Option<f64>,
    pub emotion_component: Option<f64>,
    pub emotion_data: String, // JSON as string
    pub physiological_data: String, // JSON as string
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = participant_analysis_results)]
pub struct NewParticipantAnalysisResult {
    pub participant_id: Uuid,
    pub experiment_id: Uuid,
    pub word_stimulus_id: i32,
    pub stimulus_word: String,
    pub response_word: String,
    pub reaction_time_ms: Option<i32>,
    pub spirit_probability: f64,
    pub word2vec_component: Option<f64>,
    pub reaction_time_component: Option<f64>,
    pub skin_potential_component: Option<f64>,
    pub emotion_component: Option<f64>,
    pub emotion_data: String, // JSON as string
    pub physiological_data: String, // JSON as string
}

#[derive(Queryable, SimpleObject, Debug, Clone, Serialize, Deserialize)]
pub struct WordStimulus {
    pub id: i32,
    pub word: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = word_stimuli)]
pub struct NewWordStimulus {
    pub id: i32,
    pub word: String,
}

// Keep existing models for backward compatibility
#[derive(Queryable, Selectable, Serialize, Deserialize)]
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

#[derive(Queryable, Selectable, Serialize, Deserialize)]
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

#[derive(Queryable, Selectable, Serialize, Deserialize)]
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

#[derive(Queryable, Selectable, Serialize, Deserialize)]
pub struct PhysiologicalAggregation {
    pub id: Uuid,
    pub window_id: Uuid,
    pub channels: String, // JSON as string
    pub avg: Option<f64>,
    pub quality: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = physiological_aggregations)]
pub struct NewPhysiologicalAggregation {
    pub window_id: Uuid,
    pub channels: String, // JSON as string
    pub avg: Option<f64>,
    pub quality: Option<f64>,
}

#[derive(Queryable, Selectable, Serialize, Deserialize)]
pub struct KernelFusionRun {
    pub id: Uuid,
    pub participant_id: Uuid,
    pub weights: String, // JSON as string
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
    pub weights: String, // JSON as string
    pub normalization: Option<String>,
    pub dimensions: i32,
    pub timestamp: DateTime<Utc>,
}

#[derive(Queryable, Selectable, Serialize, Deserialize)]
pub struct EmbeddingResult {
    pub id: Uuid,
    pub kernel_fusion_run_id: Uuid,
    pub method: String,
    pub dimensions: i32,
    pub points: String, // JSON as string
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = embedding_results)]
pub struct NewEmbeddingResult {
    pub kernel_fusion_run_id: Uuid,
    pub method: String,
    pub dimensions: i32,
    pub points: String, // JSON as string
}

#[derive(SimpleObject, Debug, Clone, Serialize, Deserialize, InputObject)]
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
