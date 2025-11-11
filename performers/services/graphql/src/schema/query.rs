// Merkle DAG: graphql.service.schema.query
// GraphQL Query type

use async_graphql::*;
use crate::resolvers::{ParticipantQuery, TimelineQuery};

#[derive(MergedObject, Default)]
pub struct Query(ParticipantQuery, TimelineQuery);

