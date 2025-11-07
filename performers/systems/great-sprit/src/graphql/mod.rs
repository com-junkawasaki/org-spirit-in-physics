//! GraphQL API module

pub mod schema;
pub mod query;
pub mod mutation;
pub mod subscription;

pub use schema::create_schema;

