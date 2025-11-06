//! Spirit in Physics Activities Library
//! 
//! Merkle DAG: activities.lib
//! OWL: spirit:Process
//! 
//! This library provides activity implementations for the Spirit in Physics workflow engine.
//! Activities are defined in JSON-LD format and executed through the Execution Engine.

pub mod activities;
pub mod execution;
pub mod models;
pub mod error;

pub use activities::*;
pub use execution::*;
pub use models::*;
pub use error::*;
