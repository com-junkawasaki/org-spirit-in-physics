// Merkle DAG: grpc.service.lib
// gRPC service library crate

pub mod services;
pub mod database;
pub mod auth;
pub mod error;

pub use database::PostgresPool;

