//! Error types for Spirit in Physics Activities
//! 
//! Merkle DAG: activities_rust.error
//! OWL: spirit:Process error handling

use thiserror::Error;

/// Activity execution errors
#[derive(Error, Debug)]
pub enum ActivityError {
    #[error("Activity execution failed: {0}")]
    ExecutionFailed(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Condition not met: {0}")]
    ConditionNotMet(String),

    #[error("Rule violation: {0}")]
    RuleViolation(String),

    #[error("External API error: {0}")]
    ExternalApiError(String),

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),
}

/// Result type for activity execution
pub type ActivityResult<T> = Result<T, ActivityError>;

