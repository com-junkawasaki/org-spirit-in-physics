//! Pipeline stages
//! 
//! Merkle DAG: analyzer.pipeline.stages
//! OWL: spirit:AnalysisPipeline stages

use async_trait::async_trait;
use crate::error::{AnalyzerError, AnalyzerResult};
use crate::pipeline::PipelineContext;
use crate::storage::SupabaseClient;
use crate::analysis::calculate_spirit_probability;

/// Pipeline stage trait
#[async_trait]
pub trait PipelineStage: Send + Sync {
    fn name(&self) -> &str;
    async fn execute(&self, context: &mut PipelineContext, supabase: &SupabaseClient) -> AnalyzerResult<()>;
}

/// Data Collection Stage
pub struct DataCollectionStage;

#[async_trait]
impl PipelineStage for DataCollectionStage {
    fn name(&self) -> &str {
        "DataCollection"
    }

    async fn execute(&self, context: &mut PipelineContext, supabase: &SupabaseClient) -> AnalyzerResult<()> {
        // Fetch participant
        context.participant = Some(supabase.get_participant(&context.participant_id).await?);

        // Fetch sessions
        context.sessions = supabase.get_sessions(&context.participant_id).await?;

        // Set experiment_id from first session if not set
        if context.experiment_id.is_none() {
            if let Some(session) = context.sessions.first() {
                context.experiment_id = Some(session.id.clone());
            }
        }

        // Fetch word responses
        context.word_responses = supabase.get_word_responses(&context.participant_id).await?;

        Ok(())
    }
}

/// Preprocessing Stage
pub struct PreprocessingStage;

#[async_trait]
impl PipelineStage for PreprocessingStage {
    fn name(&self) -> &str {
        "Preprocessing"
    }

    async fn execute(&self, context: &mut PipelineContext, _supabase: &SupabaseClient) -> AnalyzerResult<()> {
        // Validate data
        if context.word_responses.is_empty() {
            return Err(AnalyzerError::MissingData(
                format!("No word responses found for participant {}", context.participant_id)
            ));
        }

        // Filter responses by experiment_id if set
        if let Some(experiment_id) = &context.experiment_id {
            context.word_responses.retain(|r| r.experiment_id == *experiment_id);
        }

        Ok(())
    }
}

/// Analysis Stage
pub struct AnalysisStage;

#[async_trait]
impl PipelineStage for AnalysisStage {
    fn name(&self) -> &str {
        "Analysis"
    }

    async fn execute(&self, context: &mut PipelineContext, _supabase: &SupabaseClient) -> AnalyzerResult<()> {
        // Calculate spirit probability for each response
        context.analysis_results = context.word_responses
            .iter()
            .map(calculate_spirit_probability)
            .collect();

        Ok(())
    }
}

/// Storage Stage
pub struct StorageStage;

#[async_trait]
impl PipelineStage for StorageStage {
    fn name(&self) -> &str {
        "Storage"
    }

    async fn execute(&self, context: &mut PipelineContext, supabase: &SupabaseClient) -> AnalyzerResult<()> {
        // Save analysis results to Supabase
        supabase.save_analysis_results(&context.analysis_results).await?;

        Ok(())
    }
}

