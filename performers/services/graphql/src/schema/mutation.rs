// Merkle DAG: graphql.service.schema.mutation
// GraphQL Mutation type

use async_graphql::*;
use crate::resolvers::{ParticipantMutation, ForceGraphMutation};

#[derive(MergedObject, Default)]
pub struct Mutation(ParticipantMutation, ForceGraphMutation);

