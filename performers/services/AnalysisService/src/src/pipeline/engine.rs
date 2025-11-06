//! Pipeline execution engine
//! 
//! Merkle DAG: analyzer.pipeline.engine
//! OWL: spirit:AnalysisPipeline execution engine

use crate::error::{AnalyzerError, AnalyzerResult};
use crate::pipeline::{PipelineContext, PipelineStage, DataCollectionStage, PreprocessingStage, AnalysisStage, StorageStage};
use crate::storage::SupabaseClient;
use tracing::{info, error};

/// Pipeline execution engine
pub struct PipelineEngine {
    stages: Vec<Box<dyn PipelineStage>>,
}

impl PipelineEngine {
    pub fn new() -> Self {
        let mut stages: Vec<Box<dyn PipelineStage>> = Vec::new();
        stages.push(Box::new(DataCollectionStage));
        stages.push(Box::new(PreprocessingStage));
        stages.push(Box::new(AnalysisStage));
        stages.push(Box::new(StorageStage));

        Self { stages }
    }

    /// Execute pipeline for a participant
    pub async fn execute(&self, participant_id: String, experiment_id: Option<String>) -> AnalyzerResult<PipelineContext> {
        let mut context = PipelineContext::new(participant_id);
        
        if let Some(exp_id) = experiment_id {
            context = context.with_experiment_id(exp_id);
        }

        let supabase = SupabaseClient::new()?;

        info!("Starting pipeline execution for participant: {}", context.participant_id);

        // Execute each stage in order
        for stage in &self.stages {
            info!("Executing stage: {}", stage.name());
            
            match stage.execute(&mut context, &supabase).await {
                Ok(()) => {
                    info!("Stage {} completed successfully", stage.name());
                }
                Err(e) => {
                    error!("Stage {} failed: {}", stage.name(), e);
                    return Err(AnalyzerError::StageExecutionFailed(
                        format!("{}: {}", stage.name(), e)
                    ));
                }
            }
        }

        info!(
            "Pipeline execution completed for participant: {}. Results: {}",
            context.participant_id,
            context.analysis_results.len()
        );

        Ok(context)
    }

    /// Execute batch analysis for multiple participants
    pub async fn execute_batch(&self, participant_ids: Vec<String>) -> AnalyzerResult<Vec<PipelineContext>> {
        let mut results = Vec::new();

        for participant_id in participant_ids {
            match self.execute(participant_id, None).await {
                Ok(context) => results.push(context),
                Err(e) => {
                    error!("Failed to analyze participant: {}", e);
                    // Continue with other participants
                }
            }
        }

        Ok(results)
    }
}

impl Default for PipelineEngine {
    fn default() -> Self {
        Self::new()
    }
}

