//! Pipeline execution context
//! 
//! Merkle DAG: analyzer.pipeline.context
//! OWL: spirit:AnalysisPipeline execution context

use crate::models::{Participant, Session, WordResponse, AnalysisResult};
use std::collections::HashMap;

/// Pipeline execution context
#[derive(Debug, Clone)]
pub struct PipelineContext {
    pub participant_id: String,
    pub experiment_id: Option<String>,
    pub participant: Option<Participant>,
    pub sessions: Vec<Session>,
    pub word_responses: Vec<WordResponse>,
    pub analysis_results: Vec<AnalysisResult>,
    pub stage_results: HashMap<String, serde_json::Value>,
}

impl PipelineContext {
    pub fn new(participant_id: String) -> Self {
        Self {
            participant_id,
            experiment_id: None,
            participant: None,
            sessions: Vec::new(),
            word_responses: Vec::new(),
            analysis_results: Vec::new(),
            stage_results: HashMap::new(),
        }
    }

    pub fn with_experiment_id(mut self, experiment_id: String) -> Self {
        self.experiment_id = Some(experiment_id);
        self
    }
}

