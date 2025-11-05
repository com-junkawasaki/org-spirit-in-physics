//! GraphQL Resolvers
//! 
//! Merkle DAG: graphql.resolvers
//! OWL: spirit:GraphQL Service Port resolvers

pub mod query;
pub mod mutation;

pub use query::QueryRoot;
pub use mutation::MutationRoot;

