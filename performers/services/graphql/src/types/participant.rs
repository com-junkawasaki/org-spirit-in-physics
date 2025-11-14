// Merkle DAG: graphql.service.types.participant
// Participant GraphQL types

use async_graphql::*;
use serde::Serialize;
use uuid::Uuid;
use crate::types::enums::{HandednessType, EmotionFileType};

#[derive(SimpleObject, Debug, Clone, Serialize)]
pub struct Participant {
    pub id: ID,
    pub age: Option<i32>,
    pub gender: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub handedness: Option<String>, // ENUM型だが、GraphQLではStringとして公開
    pub created_at: String,
    pub updated_at: String,
}

#[derive(SimpleObject, Debug, Clone)]
pub struct Session {
    pub id: ID,
    pub participant_id: ID,
    pub session_index: Option<i32>,
    pub start_ts: i64,
    pub end_ts: Option<i64>,
    pub events: Vec<serde_json::Value>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(SimpleObject, Debug, Clone)]
pub struct TimelinePoint {
    pub time: String,
    pub participant_id: ID,
    pub session_id: ID,
    pub word: Option<String>,
    pub event_type: Option<String>,
    pub reaction_value: Option<f64>,
    pub reaction_time: Option<f64>,
    pub has_response: bool,
    pub emotions: Vec<EmotionData>,
    pub physiological: serde_json::Value,
    pub metadata: serde_json::Value,
}

#[derive(SimpleObject, Debug, Clone, Serialize)]
pub struct EmotionData {
    pub name: String,
    pub score: f64,
    pub file_type: String, // ENUM型だが、GraphQLではStringとして公開
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>, // HEX color code from emotion_names table
}

