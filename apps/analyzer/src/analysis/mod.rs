//! Analysis algorithms and models
//! 
//! Merkle DAG: analyzer.analysis
//! OWL: spirit:AnalysisProcess, spirit:KawasakiModel

pub mod kawasaki_model;
pub mod word2vec;
pub mod emotion;
pub mod spirit_probability;

pub use kawasaki_model::*;
pub use word2vec::*;
pub use emotion::*;
pub use spirit_probability::*;

