// Merkle DAG: graphql.service.schema.subscription
// GraphQL Subscription type

use async_graphql::MergedObject;
use crate::resolvers::subscription::ForceGraphSubscription;

#[derive(MergedObject, Default)]
pub struct Subscription(ForceGraphSubscription);

