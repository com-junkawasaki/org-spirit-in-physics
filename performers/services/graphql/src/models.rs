use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use async_graphql::{SimpleObject, InputObject};

use crate::db::schema::*;

// Only keep the basic Participant model for now
#[derive(Queryable, Selectable, Serialize, Deserialize)]
#[diesel(table_name = participants)]
pub struct Participant {
    pub id: Uuid,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub handedness: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// GraphQL type that uses String for dates
#[derive(SimpleObject)]
pub struct ParticipantGQL {
    pub id: String,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub handedness: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Insertable, Serialize, Deserialize)]
#[diesel(table_name = participants)]
pub struct NewParticipant {
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub handedness: Option<String>,
}
