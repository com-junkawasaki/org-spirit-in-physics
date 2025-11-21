// Merkle DAG: graphql.service.types.word_aggregate
// Word aggregate GraphQL types for TimescaleDB materialized views

use async_graphql::*;
use serde::{Deserialize, Serialize};

#[derive(SimpleObject, Debug, Clone)]
pub struct WordAggregate {
    pub participant_id: ID,
    pub session_id: ID,
    pub word: String,
    pub count: i64,
    pub avg_reaction_value: Option<f64>,
    pub sum_reaction_value: Option<f64>,
    pub avg_reaction_time: Option<f64>,
    pub sum_reaction_time: Option<f64>,
    pub avg_physiological: Option<f64>,
    pub sum_phys_abs: Option<f64>,
    pub phys_series: Option<Vec<Option<f64>>>,
    pub rt_series: Option<Vec<Option<f64>>>,
    pub rv_series: Option<Vec<Option<f64>>>,
    pub first_time: String,
    pub last_time: String,
}

#[derive(SimpleObject, Debug, Clone)]
pub struct EmotionVector {
    pub participant_id: ID,
    pub session_id: ID,
    pub word: String,
    pub joy_sum: Option<f64>,
    pub sadness_sum: Option<f64>,
    pub anger_sum: Option<f64>,
    pub fear_sum: Option<f64>,
    pub surprise_sum: Option<f64>,
    pub disgust_sum: Option<f64>,
    pub calm_sum: Option<f64>,
    pub focus_sum: Option<f64>,
    pub excitement_sum: Option<f64>,
    pub confusion_sum: Option<f64>,
    pub emotion_entry_count: i64,
    pub emotion_by_modality: Option<serde_json::Value>,
}

#[derive(SimpleObject, Debug, Clone)]
pub struct WordStatistics {
    pub participant_id: ID,
    pub session_id: ID,
    pub word: String,
    pub count: i64,
    pub avg_reaction_time: Option<f64>,
    pub std_reaction_time: Option<f64>,
    pub var_reaction_time: Option<f64>,
    pub avg_reaction_value: Option<f64>,
    pub std_reaction_value: Option<f64>,
    pub var_reaction_value: Option<f64>,
    pub avg_physiological: Option<f64>,
    pub std_physiological: Option<f64>,
    pub var_physiological: Option<f64>,
    pub speed_index: Option<f64>,
    pub phys_series: Option<Vec<Option<f64>>>,
    pub rt_series: Option<Vec<Option<f64>>>,
}

