//! Pipeline execution engine
//! 
//! Merkle DAG: analyzer.pipeline
//! OWL: spirit:AnalysisPipeline

pub mod engine;
pub mod stages;
pub mod context;

pub use engine::*;
pub use stages::*;
pub use context::*;

