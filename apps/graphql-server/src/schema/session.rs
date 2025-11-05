//! Session GraphQL type
//! 
//! Merkle DAG: graphql.schema.session
//! OWL: spirit:Session

use async_graphql::*;

#[derive(SimpleObject, Clone, Debug)]
pub struct Session {
    pub id: String,
    #[graphql(name = "participantId")]
    pub participant_id: String,
    #[graphql(name = "sessionId")]
    pub session_id: String,
    #[graphql(name = "sessionType")]
    pub session_type: String,
    #[graphql(name = "startTime")]
    pub start_time: String,
    #[graphql(name = "endTime")]
    pub end_time: Option<String>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

impl From<serde_json::Value> for Session {
    fn from(value: serde_json::Value) -> Self {
        Session {
            id: value["id"].as_str().unwrap_or("").to_string(),
            participant_id: value["participant_id"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            session_id: value["session_id"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            session_type: value["session_type"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            start_time: value["start_time"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            end_time: value["end_time"].as_str().map(|s| s.to_string()),
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

