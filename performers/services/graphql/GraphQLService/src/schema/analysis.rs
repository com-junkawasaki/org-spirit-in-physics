//! Analysis Result GraphQL type
//! 
//! Merkle DAG: graphql.schema.analysis
//! OWL: spirit:AnalysisResult

use async_graphql::*;
use serde_json::Value as JsonValue;

#[derive(SimpleObject, Clone, Debug)]
pub struct AnalysisResult {
    pub id: String,
    #[graphql(name = "participantId")]
    pub participant_id: String,
    #[graphql(name = "experimentId")]
    pub experiment_id: String,
    #[graphql(name = "wordStimulusId")]
    pub word_stimulus_id: i32,
    #[graphql(name = "stimulusWord")]
    pub stimulus_word: String,
    #[graphql(name = "responseWord")]
    pub response_word: String,
    #[graphql(name = "reactionTimeMs")]
    pub reaction_time_ms: Option<i32>,
    #[graphql(name = "spiritProbability")]
    pub spirit_probability: f64,
    #[graphql(name = "word2VecComponent")]
    pub word2vec_component: Option<f64>,
    #[graphql(name = "reactionTimeComponent")]
    pub reaction_time_component: Option<f64>,
    #[graphql(name = "skinPotentialComponent")]
    pub skin_potential_component: Option<f64>,
    #[graphql(name = "emotionComponent")]
    pub emotion_component: Option<f64>,
    #[graphql(name = "emotionData")]
    pub emotion_data: Option<JsonValue>,
    #[graphql(name = "physiologicalData")]
    pub physiological_data: Option<JsonValue>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

impl From<serde_json::Value> for AnalysisResult {
    fn from(value: serde_json::Value) -> Self {
        AnalysisResult {
            id: value["id"]
                .as_str()
                .map(|s| s.to_string())
                .or_else(|| value["id"].as_u64().map(|v| v.to_string()))
                .unwrap_or_else(|| "".to_string()),
            participant_id: value["participant_id"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            experiment_id: value["experiment_id"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            word_stimulus_id: value["word_stimulus_id"]
                .as_i64()
                .unwrap_or(0) as i32,
            stimulus_word: value["stimulus_word"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            response_word: value["response_word"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            reaction_time_ms: value["reaction_time_ms"]
                .as_i64()
                .map(|v| v as i32),
            spirit_probability: value["spirit_probability"]
                .as_f64()
                .unwrap_or(0.0),
            word2vec_component: value["word2vec_component"].as_f64(),
            reaction_time_component: value["reaction_time_component"].as_f64(),
            skin_potential_component: value["skin_potential_component"].as_f64(),
            emotion_component: value["emotion_component"].as_f64(),
            emotion_data: value.get("emotion_data").cloned(),
            physiological_data: value.get("physiological_data").cloned(),
            created_at: value["created_at"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            updated_at: value["updated_at"]
                .as_str()
                .unwrap_or("")
                .to_string(),
        }
    }
}

