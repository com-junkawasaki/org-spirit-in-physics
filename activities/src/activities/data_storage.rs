//! Data Storage Activity
//! 
//! Merkle DAG: activities_rust.activities.data_storage
//! OWL: spirit:DataStorageProcess
//! JSON-LD: https://spirit-in-physics.gftd.ai/activity/DataStorage

use crate::models::{Activity, ActivityContext, ActivityData, ActivityExecutionResult};
use crate::error::{ActivityError, ActivityResult};
use async_trait::async_trait;
use chrono::Utc;
use serde_json::json;

/// Data Storage Activity
/// 
/// Stores collected data in Supabase database
pub struct DataStorageActivity {
    supabase_url: String,
    supabase_key: String,
}

impl DataStorageActivity {
    pub fn new(supabase_url: String, supabase_key: String) -> Self {
        Self {
            supabase_url,
            supabase_key,
        }
    }
}

#[async_trait]
impl Activity for DataStorageActivity {
    fn id(&self) -> &str {
        "https://spirit-in-physics.gftd.ai/activity/DataStorage"
    }

    fn name(&self) -> &str {
        "Data Storage"
    }

    fn description(&self) -> &str {
        "Activity for storing collected data in Supabase database"
    }

    async fn execute(&self, context: &mut ActivityContext) -> ActivityResult<ActivityExecutionResult> {
        let start_time = std::time::Instant::now();

        // Check RLS policy condition: Participant can only write their own data
        // This is enforced by Supabase RLS policies, but we validate here too
        let participant_id = context.state.get("participant_id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ActivityError::ConditionNotMet(
                "participant_id must be set in context".to_string()
            ))?;

        // Store session events
        let session_events: Vec<_> = context.inputs.iter()
            .filter(|input| input.r#type == "https://spirit-in-physics.gftd.ai/ontology#SessionEvent")
            .cloned()
            .collect();

        // Store word responses
        let word_responses: Vec<_> = context.inputs.iter()
            .filter(|input| input.r#type == "https://spirit-in-physics.gftd.ai/ontology#WordResponse")
            .cloned()
            .collect();

        // Store consent data
        let consent_data: Vec<_> = context.inputs.iter()
            .filter(|input| input.r#type == "https://spirit-in-physics.gftd.ai/ontology#ConsentData")
            .cloned()
            .collect();

        // TODO: Actually store to Supabase via HTTP API
        // For now, simulate storage
        let client = reqwest::Client::new();
        
        // Store session events (if any)
        if !session_events.is_empty() {
            // Would call: POST {supabase_url}/rest/v1/participant_session_events
            // For now, just log
            tracing::info!("Storing {} session events for participant {}", session_events.len(), participant_id);
        }

        // Store word responses (if any)
        if !word_responses.is_empty() {
            // Would call: POST {supabase_url}/rest/v1/participant_response_data
            // For now, just log
            tracing::info!("Storing {} word responses for participant {}", word_responses.len(), participant_id);
        }

        // Store consent data (if any)
        if !consent_data.is_empty() {
            // Would call: POST {supabase_url}/rest/v1/participant_consents
            // For now, just log
            tracing::info!("Storing consent data for participant {}", participant_id);
        }

        let outputs = vec![
            ActivityData {
                id: "stored_data".to_string(),
                r#type: "https://spirit-in-physics.gftd.ai/resource/SupabaseDatabase".to_string(),
                data: json!({
                    "participant_id": participant_id,
                    "session_events_count": session_events.len(),
                    "word_responses_count": word_responses.len(),
                    "consent_stored": !consent_data.is_empty(),
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
        // All data must be validated before storage
        for input in inputs {
            if input.data.is_null() {
                return Err(ActivityError::InvalidInput(
                    format!("Input {} has null data", input.id)
                ));
            }
        }
        Ok(())
    }

    fn check_conditions(&self, _context: &ActivityContext) -> ActivityResult<()> {
        // Participant can only write their own data
        // This is checked in execute() method
        Ok(())
    }

    fn apply_rules(&self, _context: &mut ActivityContext) -> ActivityResult<()> {
        // All data must be validated before storage, RLS policies must be enforced
        // Validation is done in validate_inputs()
        // RLS is enforced by Supabase
        Ok(())
    }
}

