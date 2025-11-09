use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

// Timeline data structures matching GraphQL schema
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TimelineDataPoint {
    pub timestamp: f64,
    pub word: String,
    pub reaction_time: i32,
    pub has_response: bool,
    pub emotions: Vec<EmotionData>,
    pub physiological: PhysiologicalData,
    pub reaction_value: f64,
    pub event_type: Option<String>,
    pub metadata: Option<TimelineDataPointMetadata>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EmotionData {
    pub name: String,
    pub score: f64,
    pub file_type: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PhysiologicalData {
    pub average: Option<f64>,
    pub max: Option<f64>,
    pub min: Option<f64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TimelineDataPointMetadata {
    pub emotion_count: Option<i32>,
    pub physiological_count: Option<i32>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
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

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ParticipantTimelineResponse {
    pub timeline_data: Vec<TimelineDataPoint>,
    pub metadata: TimelineMetadata,
}

// Database models
#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = crate::db::schema::participant_timeline_cache)]
pub struct NewTimelineCache {
    pub participant_id: Uuid,
    pub timeline_data: serde_json::Value,
    pub metadata: serde_json::Value,
    pub data_version: i32,
    pub last_response_timestamp: Option<DateTime<Utc>>,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = crate::db::schema::participant_timeline_batch_jobs)]
pub struct NewBatchJob {
    pub participant_id: Uuid,
    pub status: String,
    pub progress: Option<i32>,
    pub started_at: Option<DateTime<Utc>>,
    pub metadata: Option<serde_json::Value>,
}

