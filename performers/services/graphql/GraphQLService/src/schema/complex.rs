//! Complex Analysis GraphQL types
//! 
//! Merkle DAG: graphql.schema.complex
//! OWL: spirit:Complex, spirit:GhostPattern, spirit:WordDistance

use async_graphql::*;
use serde_json::Value as JsonValue;

#[derive(SimpleObject, Clone, Debug)]
pub struct Complex {
    pub id: String,
    #[graphql(name = "participantId")]
    pub participant_id: String,
    #[graphql(name = "sessionId")]
    pub session_id: Option<String>,
    #[graphql(name = "analysisResultId")]
    pub analysis_result_id: Option<String>,
    #[graphql(name = "complexValue")]
    pub complex_value: f64,
    #[graphql(name = "wordPairs")]
    pub word_pairs: Option<JsonValue>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
}

#[derive(SimpleObject, Clone, Debug)]
pub struct GhostPattern {
    pub id: String,
    #[graphql(name = "patternType")]
    pub pattern_type: String,
    #[graphql(name = "patternName")]
    pub pattern_name: String,
    #[graphql(name = "participantId")]
    pub participant_id: Option<String>,
    #[graphql(name = "complexId")]
    pub complex_id: Option<String>,
    pub confidence: f64,
    #[graphql(name = "wordAssociations")]
    pub word_associations: Option<JsonValue>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
}

#[derive(SimpleObject, Clone, Debug)]
pub struct WordDistance {
    pub id: String,
    #[graphql(name = "participantId")]
    pub participant_id: String,
    #[graphql(name = "sessionId")]
    pub session_id: Option<String>,
    pub word1: String,
    pub word2: String,
    #[graphql(name = "distanceType")]
    pub distance_type: String,
    #[graphql(name = "distanceValue")]
    pub distance_value: f64,
    #[graphql(name = "word1Vector")]
    pub word1_vector: Option<JsonValue>,
    #[graphql(name = "word2Vector")]
    pub word2_vector: Option<JsonValue>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
}

#[derive(SimpleObject, Clone, Debug)]
pub struct ComplexAnalysis {
    #[graphql(name = "complexValue")]
    pub complex_value: f64,
    #[graphql(name = "ghostPatterns")]
    pub ghost_patterns: Vec<GhostPattern>,
    #[graphql(name = "wordDistances")]
    pub word_distances: Vec<WordDistance>,
}

impl From<serde_json::Value> for Complex {
    fn from(value: serde_json::Value) -> Self {
        Complex {
            id: value["id"]
                .as_str()
                .map(|s| s.to_string())
                .or_else(|| value["id"].as_u64().map(|v| v.to_string()))
                .unwrap_or_else(|| "".to_string()),
            participant_id: value["participant_id"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            session_id: value["session_id"].as_str().map(|s| s.to_string()),
            analysis_result_id: value["analysis_result_id"]
                .as_str()
                .map(|s| s.to_string()),
            complex_value: value["complex_value"]
                .as_f64()
                .or_else(|| value["complex_value"].as_str().and_then(|s| s.parse::<f64>().ok()))
                .unwrap_or(0.0),
            word_pairs: value.get("word_pairs").cloned(),
            created_at: value["created_at"]
                .as_str()
                .unwrap_or("")
                .to_string(),
        }
    }
}

impl From<serde_json::Value> for GhostPattern {
    fn from(value: serde_json::Value) -> Self {
        GhostPattern {
            id: value["id"]
                .as_str()
                .map(|s| s.to_string())
                .or_else(|| value["id"].as_u64().map(|v| v.to_string()))
                .unwrap_or_else(|| "".to_string()),
            pattern_type: value["pattern_type"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            pattern_name: value["pattern_name"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            participant_id: value["participant_id"].as_str().map(|s| s.to_string()),
            complex_id: value["complex_id"].as_str().map(|s| s.to_string()),
            confidence: value["confidence"]
                .as_f64()
                .or_else(|| value["confidence"].as_str().and_then(|s| s.parse::<f64>().ok()))
                .unwrap_or(0.0),
            word_associations: value.get("word_associations").cloned(),
            created_at: value["created_at"]
                .as_str()
                .unwrap_or("")
                .to_string(),
        }
    }
}

impl From<serde_json::Value> for WordDistance {
    fn from(value: serde_json::Value) -> Self {
        WordDistance {
            id: value["id"]
                .as_str()
                .map(|s| s.to_string())
                .or_else(|| value["id"].as_u64().map(|v| v.to_string()))
                .unwrap_or_else(|| "".to_string()),
            participant_id: value["participant_id"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            session_id: value["session_id"].as_str().map(|s| s.to_string()),
            word1: value["word1"].as_str().unwrap_or("").to_string(),
            word2: value["word2"].as_str().unwrap_or("").to_string(),
            distance_type: value["distance_type"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            distance_value: value["distance_value"]
                .as_f64()
                .or_else(|| value["distance_value"].as_str().and_then(|s| s.parse::<f64>().ok()))
                .unwrap_or(0.0),
            word1_vector: value.get("word1_vector").cloned(),
            word2_vector: value.get("word2_vector").cloned(),
            created_at: value["created_at"]
                .as_str()
                .unwrap_or("")
                .to_string(),
        }
    }
}

