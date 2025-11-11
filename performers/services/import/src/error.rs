// Merkle DAG: import.service.error
// Error types for import operations

use thiserror::Error;

#[derive(Debug, Error)]
pub enum ImportError {
    #[error("Database error: {0}")]
    Database(String),

    #[error("Session not found: {0}")]
    SessionNotFound(String),

    #[error("Participant not found: {0}")]
    ParticipantNotFound(String),

    #[error("File I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON parse error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("CSV parse error: {0}")]
    Csv(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Configuration error: {0}")]
    Config(String),
}

impl From<sqlx::Error> for ImportError {
    fn from(err: sqlx::Error) -> Self {
        ImportError::Database(err.to_string())
    }
}

