//! Spirit in Physics Activities Library
//! 
//! Merkle DAG: activities_rust.lib
//! OWL: spirit:Process
//! 
//! This library provides activity implementations for the Spirit in Physics workflow engine.
//! Activities are defined in JSON-LD format and executed through the Execution Engine.

//! Spirit in Physics Activities Shared Library
//! 
//! Merkle DAG: activities.shared.lib
//! OWL: spirit:Process
//! 
//! This library provides shared infrastructure for activity implementations.
//! Activities are defined in JSON-LD format and executed through the Execution Engine.
//! Individual activities are located in their own directories under activities/.

// Activities are now in their own directories
pub mod execution;
pub mod models;
pub mod error;

pub use execution::*;
pub use models::*;
pub use error::*;

