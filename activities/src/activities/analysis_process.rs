//! Analysis Process Activity
//! 
//! Merkle DAG: activities_rust.activities.analysis_process
//! OWL: spirit:AnalysisProcess
//! JSON-LD: https://spirit-in-physics.gftd.ai/activity/AnalysisProcess

use crate::models::{Activity, ActivityContext, ActivityData, ActivityExecutionResult};
use crate::error::{ActivityError, ActivityResult};
use async_trait::async_trait;
use chrono::Utc;
use serde_json::json;

/// Analysis Process Activity
/// 
/// Executes analysis using Kawasaki Model to calculate spirit probability
pub struct AnalysisProcessActivity;

impl AnalysisProcessActivity {
    pub fn new() -> Self {
        Self
    }

    /// Calculate spirit probability using Kawasaki Model
    /// Formula: SP = f(Word2Vec, Emotion, ReactionTime)
    fn calculate_spirit_probability(
        &self,
        word2vec_component: f64,
        emotion_component: f64,
        reaction_time_component: f64,
    ) -> f64 {
        // Simplified Kawasaki Model calculation
        // TODO: Implement actual formula from research
        (word2vec_component * 0.4 + emotion_component * 0.4 + reaction_time_component * 0.2)
            .clamp(0.0, 1.0)
    }
}

#[async_trait]
impl Activity for AnalysisProcessActivity {
    fn id(&self) -> &str {
        "https://spirit-in-physics.gftd.ai/activity/AnalysisProcess"
    }

    fn name(&self) -> &str {
        "Analysis Process"
    }

    fn description(&self) -> &str {
        "Activity for executing analysis using Kawasaki Model to calculate spirit probability"
    }

    async fn execute(&self, context: &mut ActivityContext) -> ActivityResult<ActivityExecutionResult> {
        let start_time = std::time::Instant::now();

        // Get word response data
        let word_responses: Vec<_> = context.inputs.iter()
            .filter(|input| input.r#type == "https://spirit-in-physics.gftd.ai/ontology#WordResponse")
            .cloned()
            .collect();

        if word_responses.is_empty() {
            return Err(ActivityError::InvalidInput(
                "No word response data provided".to_string()
            ));
        }

        // Process each word response
        let mut analysis_results = Vec::new();

        for word_response in &word_responses {
            if let Some(obj) = word_response.data.as_object() {
                // Extract components
                let word2vec_component = obj.get("word2vec_component")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.5);

                let emotion_component = obj.get("emotion_component")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.5);

                let reaction_time_ms = obj.get("reaction_time_ms")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(1000) as f64;

                // Normalize reaction time component (assuming 0-5000ms range)
                let reaction_time_component = (1.0 - (reaction_time_ms / 5000.0).min(1.0)).max(0.0);

                // Calculate spirit probability
                let spirit_probability = self.calculate_spirit_probability(
                    word2vec_component,
                    emotion_component,
                    reaction_time_component,
                );

                analysis_results.push(json!({
                    "stimulus_word": obj.get("stimulus_word"),
                    "response_word": obj.get("response_word"),
                    "spirit_probability": spirit_probability,
                    "word2vec_component": word2vec_component,
                    "emotion_component": emotion_component,
                    "reaction_time_component": reaction_time_component,
                }));
            }
        }

        let outputs = vec![
            ActivityData {
                id: "analysis_results".to_string(),
                r#type: "https://spirit-in-physics.gftd.ai/ontology#AnalysisResult".to_string(),
                data: json!({
                    "results": analysis_results,
                    "total_count": analysis_results.len(),
                }),
            },
        ];

        context.outputs = outputs.clone();

        let execution_time = start_time.elapsed().as_millis() as u64;

        Ok(ActivityExecutionResult {
            activity_id: self.id().to_string(),
            success: true,
            outputs,
            error: None,
            execution_time_ms: execution_time,
            timestamp: Utc::now(),
        })
    }

    fn validate_inputs(&self, inputs: &[ActivityData]) -> ActivityResult<()> {
        // All required input data must be available and valid
        let has_word_response = inputs.iter()
            .any(|input| input.r#type == "https://spirit-in-physics.gftd.ai/ontology#WordResponse");

        if !has_word_response {
            return Err(ActivityError::InvalidInput(
                "Word response data is required".to_string()
            ));
        }

        Ok(())
    }

    fn check_conditions(&self, context: &ActivityContext) -> ActivityResult<()> {
        // All required input data must be available and valid
        self.validate_inputs(&context.inputs)
    }

    fn apply_rules(&self, _context: &mut ActivityContext) -> ActivityResult<()> {
        // Spirit probability must be calculated using Kawasaki Model formula
        // This is enforced in execute() method
        Ok(())
    }
}

impl Default for AnalysisProcessActivity {
    fn default() -> Self {
        Self::new()
    }
}

