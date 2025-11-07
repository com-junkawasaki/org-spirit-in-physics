use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use async_graphql::{SimpleObject, InputObject};

use crate::db::schema::*;

// Only keep the basic Participant model for now
// Note: gender field is skipped due to GenderType enum complexity
#[derive(Queryable, Serialize, Deserialize)]
#[diesel(table_name = participants)]
pub struct Participant {
    pub id: Uuid,
    pub age: Option<i32>,
    // gender field skipped - uses GenderType enum which requires custom handling
    pub handedness: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub name: Option<String>,
    pub ethnicity: Option<String>,
    pub income: Option<String>,
    pub consent_version: Option<String>,
    pub study_id: Option<String>,
}

// GraphQL type that uses String for dates
#[derive(SimpleObject, Serialize, Deserialize)]
pub struct ParticipantGQL {
    pub id: String,
    pub age: Option<i32>,
    pub gender: Option<String>, // Can be set manually if needed
    pub handedness: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = participants)]
pub struct NewParticipant {
    pub age: Option<i32>,
    // Note: gender field uses GenderType enum, skipping for now
    // pub gender: Option<String>,
    pub handedness: Option<String>,
    pub name: Option<String>,
    pub ethnicity: Option<String>,
    pub income: Option<String>,
    pub consent_version: Option<String>,
    pub study_id: Option<String>,
}
