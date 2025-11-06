use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, Queryable)]
pub struct Participant {
    pub id: Uuid,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub handedness: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Note: Insertable will be properly configured after diesel schema generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewParticipant {
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub handedness: Option<String>,
}

