// Merkle DAG: import.service.types.session
// Session types with type-level validation

use crate::neo4j::client::Neo4jClient;
use crate::neo4j::row_utils;
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

        // セッションIDとセッションインデックスを取得
        let query = r#"
            MATCH (p:Participant {id: $participant_id})-[:HAS_SESSION]->(s:Session)
            RETURN s.id as sessionId, s.session_index as sessionIndex
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

        // neo4rs::Rowから値を取得
        // 最初の行からsessionIdを取得
        let row = rows.first()
            .ok_or_else(|| ImportError::SessionNotFound(format!(
                "No session found for participant {}",
                participant_id
            )))?;
        
        // row_utilsを使用してセッションIDを取得
        let session_id = match row_utils::get_string(row, "sessionId") {
            Ok(id) => id,
            Err(e) => {
                // フォールバック: セッションIDを推測
                // 実際のセッションIDは、neo4j-manager.tsのsaveSession関数で作成される形式に従う
                // 形式: {participantId}-{sessionIndex} または {participantId}_{sessionIndex}
                // セッションインデックスが0の場合、{participantId}-0の形式になる
                use tracing::warn;
                warn!("Failed to extract sessionId from row: {}. Using fallback format.", e);
                format!("{}-0", participant_id)
            }
        };
        
        // ログを追加して、実際のセッションIDを確認
        use tracing::info;
        info!("ValidatedSessionId::from_participant: Using session_id {} for participant {}", session_id, participant_id);
        
        Ok(ValidatedSessionId(session_id))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }
}

