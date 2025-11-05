//! Session model
//! 
//! Merkle DAG: analyzer.models.session
//! OWL: spirit:ExperimentSession

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub participant_id: String,
    pub session_id: String,
    pub session_type: String,
    pub start_time: String,
    pub end_time: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

