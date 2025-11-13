// Merkle DAG: graphql.service.schema.mutation
// GraphQL Mutation type

use async_graphql::*;
use crate::resolvers::ParticipantMutation;

#[derive(MergedObject, Default)]
pub struct Mutation(ParticipantMutation);

