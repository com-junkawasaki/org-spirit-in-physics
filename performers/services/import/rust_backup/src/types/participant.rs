// Merkle DAG: import.service.types.participant
// Participant type definitions

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Participant {
    pub id: String,
    pub signature: Option<String>,
    pub agreed_at: Option<String>,
    pub agreements: Option<serde_json::Value>,
    pub name: Option<String>,
    pub age: Option<u32>,
    pub gender: Option<String>,
    pub handedness: Option<String>,
    pub has_session_data: Option<bool>,
    pub has_video_files: Option<bool>,
    pub has_hume_data: Option<bool>,
    pub imported_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsentData {
    pub participant_id: String,
    pub signature: String,
    pub agreed_at: String,
    pub agreements: serde_json::Value,
}

