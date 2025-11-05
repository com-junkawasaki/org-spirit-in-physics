//! Participant GraphQL type
//! 
//! Merkle DAG: graphql.schema.participant
//! OWL: spirit:Participant

use async_graphql::*;

#[derive(SimpleObject, Clone, Debug)]
pub struct Participant {
    pub id: String,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub handedness: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<serde_json::Value> for Participant {
    fn from(value: serde_json::Value) -> Self {
        Participant {
            id: value["id"].as_str().unwrap_or("").to_string(),
            age: value["age"].as_i64().map(|v| v as i32),
            gender: value["gender"].as_str().map(|s| s.to_string()),
            handedness: value["handedness"].as_str().map(|s| s.to_string()),
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

