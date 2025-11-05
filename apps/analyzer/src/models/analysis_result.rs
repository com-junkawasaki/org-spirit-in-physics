//! Analysis Result model
//! 
//! Merkle DAG: analyzer.models.analysis_result
//! OWL: spirit:AnalysisResult

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub id: Option<String>,
    pub participant_id: String,
    pub experiment_id: String,
    pub word_stimulus_id: i32,
    pub stimulus_word: String,
    pub response_word: String,
    pub reaction_time_ms: Option<i32>,
    pub spirit_probability: f64,
    pub word2vec_component: Option<f64>,
    pub reaction_time_component: Option<f64>,
    pub skin_potential_component: Option<f64>,
    pub emotion_component: Option<f64>,
    pub emotion_data: Option<Value>,
    pub physiological_data: Option<Value>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordResponse {
    pub id: Option<String>,
    pub participant_id: String,
    pub experiment_id: String,
    pub word_stimulus_id: i32,
    pub stimulus_word: String,
    pub response_word: String,
    pub reaction_time_ms: Option<i32>,
    pub session: String,
    pub timestamp: Option<String>,
    pub emotion: Option<String>,
    pub emotion_confidence: Option<f64>,
    pub skin_potential: Option<f64>,
}

