//! Session Response GraphQL types
//! 
//! Merkle DAG: graphql.schema.session_response
//! OWL: spirit:SessionResponse

use async_graphql::*;
use serde_json::Value as JsonValue;

#[derive(SimpleObject, Clone, Debug)]
pub struct SaveSessionResponse {
    pub success: bool,
    pub session_id: String,
    pub message: String,
}

#[derive(InputObject)]
pub struct SaveSessionInput {
    pub participant_id: String,
    pub events: Vec<SessionEventInput>,
    pub word_responses: Vec<WordResponseInput>,
}

#[derive(InputObject)]
#[graphql(rename_fields = "camelCase")]
pub struct SessionEventInput {
    pub r#type: String,
    pub timestamp: i64,
    pub payload: Option<JsonValue>,
}

#[derive(InputObject)]
#[graphql(rename_fields = "camelCase")]
pub struct WordResponseInput {
    #[graphql(name = "stimulusWord")]
    pub stimulus_word: JsonValue, // String or { word: String, key: String }
    #[graphql(name = "responseWord")]
    pub response_word: String,
    #[graphql(name = "reactionTimeMs")]
    pub reaction_time_ms: i32,
    #[graphql(name = "isDelayed")]
    pub is_delayed: Option<bool>,
    pub timestamp: Option<String>,
}

#[derive(SimpleObject, Clone, Debug)]
pub struct SessionEvent {
    pub r#type: String,
    pub timestamp: i64,
    pub payload: JsonValue,
}

impl From<JsonValue> for SessionEvent {
    fn from(value: JsonValue) -> Self {
        SessionEvent {
            r#type: value["event_type"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            timestamp: value["timestamp"]
                .as_str()
                .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
                .map(|dt| dt.timestamp_millis())
                .unwrap_or(0),
            payload: value.get("payload").cloned().unwrap_or(JsonValue::Null),
        }
    }
}

