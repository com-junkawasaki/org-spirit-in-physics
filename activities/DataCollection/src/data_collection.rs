//! Data Collection Activity
//! 
//! Merkle DAG: activities_rust.activities.data_collection
//! OWL: spirit:DataCollectionProcess
//! JSON-LD: https://spirit-in-physics.gftd.ai/activity/DataCollection

use spirit_activities_shared::models::{Activity, ActivityContext, ActivityData, ActivityExecutionResult};
use spirit_activities_shared::error::{ActivityError, ActivityResult};
use async_trait::async_trait;
use chrono::Utc;
use serde_json::json;

/// Data Collection Activity
/// 
/// Collects experimental data from participants including consent, session events, and word responses
pub struct DataCollectionActivity;

impl DataCollectionActivity {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Activity for DataCollectionActivity {
    fn id(&self) -> &str {
        "https://spirit-in-physics.gftd.ai/activity/DataCollection"
    }

    fn name(&self) -> &str {
        "Data Collection"
    }

    fn description(&self) -> &str {
        "Activity for collecting experimental data from participants including consent, session events, and word responses"
    }

    async fn execute(&self, context: &mut ActivityContext) -> ActivityResult<ActivityExecutionResult> {
        let start_time = std::time::Instant::now();

        // Validate that consent exists before collecting data
        let has_consent = context.inputs.iter()
            .any(|input| input.r#type == "https://spirit-in-physics.gftd.ai/ontology#ConsentData");

        if !has_consent {
            return Err(ActivityError::ConditionNotMet(
                "Participant must have provided consent before data collection".to_string()
            ));
        }

        // Collect session events
        let session_events: Vec<_> = context.inputs.iter()
            .filter(|input| input.r#type == "https://spirit-in-physics.gftd.ai/ontology#SessionEvent")
            .cloned()
            .collect();

        // Collect word responses
        let word_responses: Vec<_> = context.inputs.iter()
            .filter(|input| input.r#type == "https://spirit-in-physics.gftd.ai/ontology#WordResponse")
            .cloned()
            .collect();

        // Collect consent data
        let consent_data: Vec<_> = context.inputs.iter()
            .filter(|input| input.r#type == "https://spirit-in-physics.gftd.ai/ontology#ConsentData")
            .cloned()
            .collect();

        // Store in context state
        context.state.insert("session_events_count".to_string(), json!(session_events.len()));
        context.state.insert("word_responses_count".to_string(), json!(word_responses.len()));
        context.state.insert("consent_data_count".to_string(), json!(consent_data.len()));

        // Create outputs
        let outputs = vec![
            ActivityData {
                id: "session_events".to_string(),
                r#type: "https://spirit-in-physics.gftd.ai/ontology#SessionEvent".to_string(),
                data: json!(session_events),
            },
            ActivityData {
                id: "word_responses".to_string(),
                r#type: "https://spirit-in-physics.gftd.ai/ontology#WordResponse".to_string(),
                data: json!(word_responses),
            },
            ActivityData {
                id: "consent_data".to_string(),
                r#type: "https://spirit-in-physics.gftd.ai/ontology#ConsentData".to_string(),
                data: json!(consent_data),
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
        // All word responses must have timestamps and stimulus words
        for input in inputs {
            if input.r#type == "https://spirit-in-physics.gftd.ai/ontology#WordResponse" {
                if let Some(obj) = input.data.as_object() {
                    if !obj.contains_key("timestamp") {
                        return Err(ActivityError::InvalidInput(
                            "Word response must have timestamp".to_string()
                        ));
                    }
                    if !obj.contains_key("stimulus_word") {
                        return Err(ActivityError::InvalidInput(
                            "Word response must have stimulus_word".to_string()
                        ));
                    }
                }
            }
        }
        Ok(())
    }

    fn check_conditions(&self, context: &ActivityContext) -> ActivityResult<()> {
        // Participant must have provided consent before data collection
        let has_consent = context.inputs.iter()
            .any(|input| input.r#type == "https://spirit-in-physics.gftd.ai/ontology#ConsentData");

        if !has_consent {
            return Err(ActivityError::ConditionNotMet(
                "Participant must have provided consent before data collection".to_string()
            ));
        }

        Ok(())
    }

    fn apply_rules(&self, _context: &mut ActivityContext) -> ActivityResult<()> {
        // All word responses must have associated timestamps and stimulus words
        // This is already validated in validate_inputs
        Ok(())
    }
}

impl Default for DataCollectionActivity {
    fn default() -> Self {
        Self::new()
    }
}

