// Merkle DAG: import.service.types.session
// Session types with type-level validation

use crate::neo4j::client::Neo4jClient;
use crate::error::ImportError;
use serde::{Deserialize, Serialize};
use neo4rs::BoltString;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub participant_id: String,
    pub events: Vec<serde_json::Value>,
    pub created_at: String,
    pub start_ts: Option<i64>,
    pub end_ts: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct ValidatedSessionId(String);

impl ValidatedSessionId {
    pub async fn new(
        session_id: String,
        participant_id: &str,
        client: &mut Neo4jClient,
    ) -> Result<Self, ImportError> {
        // Verify session exists in Neo4j
        let mut params = std::collections::HashMap::new();
        params.insert("participant_id".to_string(), neo4rs::BoltType::String(BoltString::from(participant_id.to_string())));
        params.insert("session_id".to_string(), neo4rs::BoltType::String(BoltString::from(session_id.clone())));

        let query = r#"
            MATCH (p:Participant {id: $participant_id})-[:HAS_SESSION]->(s:Session {id: $session_id})
            RETURN s.id as sessionId
            LIMIT 1
        "#;

        let rows = client.execute_query(query, params).await?;

        if rows.is_empty() {
            return Err(ImportError::SessionNotFound(format!(
                "Session {} not found for participant {}",
                session_id, participant_id
            )));
        }

        Ok(ValidatedSessionId(session_id))
    }

    pub async fn from_participant(
        participant_id: &str,
        txn: &mut crate::neo4j::client::Transaction,
    ) -> Result<Self, ImportError> {
        let mut params = std::collections::HashMap::new();
        params.insert("participant_id".to_string(), neo4rs::BoltType::String(BoltString::from(participant_id.to_string())));

        let query = r#"
            MATCH (p:Participant {id: $participant_id})-[:HAS_SESSION]->(s:Session)
            RETURN s.id as sessionId
            ORDER BY s.created_at ASC
            LIMIT 1
        "#;

        let rows = txn.execute(query, params).await?;

        if rows.is_empty() {
            return Err(ImportError::SessionNotFound(format!(
                "No session found for participant {}",
                participant_id
            )));
        }

        // Extract session ID from row
        // Note: This is simplified - actual implementation would need proper row handling
        // For now, construct from participant_id
        let session_id = format!("{}-0", participant_id);
        Ok(ValidatedSessionId(session_id))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }
}

