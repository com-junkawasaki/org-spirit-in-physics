use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use async_graphql::SimpleObject;

use crate::db::schema::*;

// Only keep the basic Participant model for now
// Note: gender field is skipped due to GenderType enum complexity
#[derive(Queryable, Serialize, Deserialize)]
#[diesel(table_name = participants)]
pub struct Participant {
    pub id: Uuid,
    pub age: Option<i32>,
    // gender field skipped - uses GenderType enum which requires custom handling
    pub handedness: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

// GraphQL type that uses String for dates
#[derive(SimpleObject, Serialize, Deserialize)]
pub struct ParticipantGQL {
    pub id: String,
    pub age: Option<i32>,
    pub gender: Option<String>, // Can be set manually if needed
    pub handedness: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emotion_data_count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub physiological_data_count: Option<i64>,
    #[graphql(name = "averageSpiritProbability")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub average_spirit_probability: Option<f64>,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = participants)]
pub struct NewParticipant {
    pub age: Option<i32>,
    // Note: gender field uses GenderType enum, skipping for now
    // pub gender: Option<String>,
    pub handedness: Option<String>,
}

// Statistics structures for aggregates
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Stats {
    pub avg: f64,
    pub std_dev: f64,
    pub max: f64,
    pub min: f64,
    pub count: i32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct StatsWithMedian {
    pub avg: f64,
    pub std_dev: f64,
    pub max: f64,
    pub min: f64,
    pub count: i32,
    pub median: f64,
}

// Word-second aggregates
#[derive(Queryable, Insertable, Serialize, Deserialize, Clone, Debug)]
#[diesel(table_name = participant_word_second_aggregates)]
pub struct WordSecondAggregate {
    pub id: Uuid,
    pub participant_id: Uuid,
    pub stimulus_word: String,
    pub second_timestamp: DateTime<Utc>,
    pub reaction_time_stats: serde_json::Value,
    pub emotion_stats: serde_json::Value,
    pub physiological_stats: serde_json::Value,
    pub response_count: i32,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = participant_word_second_aggregates)]
pub struct NewWordSecondAggregate {
    pub participant_id: Uuid,
    pub stimulus_word: String,
    pub second_timestamp: DateTime<Utc>,
    pub reaction_time_stats: serde_json::Value,
    pub emotion_stats: serde_json::Value,
    pub physiological_stats: serde_json::Value,
    pub response_count: i32,
}

// Word aggregates
#[derive(Queryable, Insertable, Serialize, Deserialize, Clone, Debug)]
#[diesel(table_name = participant_word_aggregates)]
pub struct WordAggregate {
    pub participant_id: Uuid,
    pub stimulus_word: String,
    pub reaction_time_stats: serde_json::Value,
    pub emotion_stats: serde_json::Value,
    pub physiological_stats: serde_json::Value,
    pub total_responses: i32,
    pub total_seconds: i32,
    pub first_occurrence: Option<DateTime<Utc>>,
    pub last_occurrence: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = participant_word_aggregates)]
pub struct NewWordAggregate {
    pub participant_id: Uuid,
    pub stimulus_word: String,
    pub reaction_time_stats: serde_json::Value,
    pub emotion_stats: serde_json::Value,
    pub physiological_stats: serde_json::Value,
    pub total_responses: i32,
    pub total_seconds: i32,
    pub first_occurrence: Option<DateTime<Utc>>,
    pub last_occurrence: Option<DateTime<Utc>>,
}

// Force graph data structures
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ForceGraphNode {
    pub id: String,
    pub label: String,
    pub reaction_time: Stats,
    pub emotions: std::collections::HashMap<String, Stats>,
    pub physiological: Stats,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ForceGraphLink {
    pub source: String,
    pub target: String,
    pub weight: f64,
    pub correlation_type: String, // "emotion" | "physiological" | "reactionTime"
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ForceGraphData {
    pub nodes: Vec<ForceGraphNode>,
    pub links: Vec<ForceGraphLink>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ForceGraphMetadata {
    pub node_count: i32,
    pub link_count: i32,
    pub generated_at: DateTime<Utc>,
}
