// Merkle DAG: graphql.service.types.stimulus_word
// StimulusWord GraphQL type

use async_graphql::*;
use serde::Serialize;

#[derive(SimpleObject, Debug, Clone, Serialize)]
pub struct StimulusWord {
    pub id: i32,
    pub japanese: String,
    pub english: String,
    pub pronunciation: String,
}

