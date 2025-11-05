//! Error types for Spirit Analyzer
//! 
//! Merkle DAG: analyzer.error
//! OWL: spirit:AnalysisPipeline error handling

use thiserror::Error;

/// Analyzer execution errors
#[derive(Error, Debug)]
pub enum AnalyzerError {
    #[error("Pipeline execution failed: {0}")]
    PipelineExecutionFailed(String),

    #[error("Stage execution failed: {0}")]
    StageExecutionFailed(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Supabase error: {0}")]
    SupabaseError(String),

    #[error("HTTP error: {0}")]
    HttpError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Missing required data: {0}")]
    MissingData(String),
}

/// Result type for analyzer operations
pub type AnalyzerResult<T> = Result<T, AnalyzerError>;

