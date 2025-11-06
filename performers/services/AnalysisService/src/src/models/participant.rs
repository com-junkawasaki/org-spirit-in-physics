//! Participant model
//! 
//! Merkle DAG: analyzer.models.participant
//! OWL: spirit:Participant

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Participant {
    pub id: String,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub handedness: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

