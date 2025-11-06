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

// Re-export common types for convenience
pub use activities::*;
pub use execution::*;
pub use models::*;
pub use error::*;

// Explicit re-exports for Activity trait and related types
pub use models::Activity;
pub use models::ActivityContext;
pub use models::ActivityData;
pub use models::ActivityExecutionResult;
pub use error::ActivityResult;
pub use error::ActivityError;

// Re-export activity implementations
pub use activities::DataCollectionActivity;
pub use activities::DataStorageActivity;
pub use activities::AnalysisProcessActivity;
pub use activities::TimelineIntegrationActivity;
pub use activities::VisualizationProcessActivity;
pub use activities::DataImportActivity;
