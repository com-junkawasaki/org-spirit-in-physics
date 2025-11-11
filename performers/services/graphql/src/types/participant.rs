// Merkle DAG: graphql.service.types.participant
// Participant GraphQL types

use async_graphql::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(SimpleObject, Debug, Clone)]
pub struct Participant {
    pub id: ID,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub handedness: Option<String>,
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

#[derive(SimpleObject, Debug, Clone)]
pub struct EmotionData {
    pub name: String,
    pub score: f64,
    pub file_type: String,
}

