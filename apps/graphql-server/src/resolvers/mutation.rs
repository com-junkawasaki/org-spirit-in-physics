//! GraphQL Mutation resolvers
//! 
//! Merkle DAG: graphql.resolvers.mutation
//! OWL: spirit:GraphQL Mutation resolvers

use async_graphql::*;
use crate::schema::{
    ActivityExecutionResponse, Participant, Consent, SaveSessionResponse, SaveVideoResponse,
    CreateParticipantInput, ConsentInput, SaveSessionInput, SaveVideoInput, AnalyzeVideoInput,
};
use crate::storage::SupabaseClient;
use reqwest::Client;
use serde_json::{json, Value as JsonValue};
use std::env;

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Execute an activity via Rust activities server
    async fn execute_activity(
        &self,
        _ctx: &Context<'_>,
        activity_id: String,
        inputs: JsonValue,
    ) -> Result<ActivityExecutionResponse> {
        let rust_activities_url = env::var("RUST_ACTIVITIES_URL")
            .unwrap_or_else(|_| "http://localhost:3001".to_string());

        let client = Client::new();
        let response = client
            .post(&format!("{}/execute", rust_activities_url))
            .json(&json!({
                "activity_id": activity_id,
                "inputs": inputs,
            }))
            .send()
            .await
            .map_err(|e| Error::new(format!("Failed to call activities server: {}", e)))?;

        if !response.status().is_success() {
            return Ok(ActivityExecutionResponse {
                success: false,
                result: None,
                error: Some(format!("Activities server error: {}", response.status())),
            });
        }

        let result: JsonValue = response.json().await
            .map_err(|e| Error::new(format!("Failed to parse response: {}", e)))?;

        Ok(ActivityExecutionResponse::from(result))
    }

    /// Analyze participant data via Rust analyzer server
    async fn analyze_participant(
        &self,
        _ctx: &Context<'_>,
        #[graphql(name = "participantId")] participant_id: String,
        #[graphql(name = "experimentId")] experiment_id: Option<String>,
    ) -> Result<ActivityExecutionResponse> {
        let analyzer_url = env::var("ANALYZER_URL")
            .unwrap_or_else(|_| "http://localhost:3002".to_string());

        let client = Client::new();
        let response = client
            .post(&format!("{}/analyze", analyzer_url))
            .json(&json!({
                "participant_id": participant_id,
                "experiment_id": experiment_id,
            }))
            .send()
            .await
            .map_err(|e| Error::new(format!("Failed to call analyzer server: {}", e)))?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Ok(ActivityExecutionResponse {
                success: false,
                result: None,
                error: Some(format!("Analyzer server error: {} - {}", status, error_text)),
            });
        }

        let result: JsonValue = response.json().await
            .map_err(|e| Error::new(format!("Failed to parse response: {}", e)))?;

        // Transform analyzer response to ActivityExecutionResponse format
        let success = result["success"].as_bool().unwrap_or(false);
        let response_data = if success {
            Some(json!({
                "activityId": "https://spirit-in-physics.gftd.ai/activity/AnalysisProcess",
                "success": success,
                "outputs": [{
                    "id": "analysis-results",
                    "type": "https://spirit-in-physics.gftd.ai/ontology#AnalysisResult",
                    "data": {
                        "participant_id": result["participant_id"],
                        "results_count": result["results_count"],
                    },
                }],
                "error": result["error"],
                "executionTimeMs": 0,
                "timestamp": chrono::Utc::now().to_rfc3339(),
            }))
        } else {
            None
        };

        Ok(ActivityExecutionResponse {
            success,
            result: response_data,
            error: result["error"].as_str().map(|s| s.to_string()),
        })
    }

    /// Create a new participant
    async fn create_participant(
        &self,
        ctx: &Context<'_>,
        input: CreateParticipantInput,
    ) -> Result<Participant> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let data = supabase.create_participant(input.age, input.gender.as_deref(), input.handedness.as_deref()).await
            .map_err(|e| Error::new(format!("Failed to create participant: {}", e)))?;
        
        Ok(Participant::from(data))
    }

    /// Save consent information
    async fn save_consent(
        &self,
        ctx: &Context<'_>,
        input: ConsentInput,
    ) -> Result<Consent> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let demographic_data = input.demographic_data.as_ref().map(|d| {
            serde_json::json!({
                "ageGroup": d.age_group,
                "gender": d.gender,
                "ethnicity": d.ethnicity,
                "income": d.income,
            })
        });
        
        let data = supabase.save_consent(
            &input.participant_id,
            &input.signature,
            &input.agreements,
            &input.agreed_at,
            input.consent_version.as_deref(),
            input.study_id.as_deref(),
            input.user_agent.as_deref(),
            input.ip_address.as_deref(),
            input.consent_text.as_deref(),
            demographic_data.as_ref(),
        ).await
            .map_err(|e| Error::new(format!("Failed to save consent: {}", e)))?;
        
        Ok(Consent::from(data))
    }

    /// Save session data with events and word responses
    async fn save_session(
        &self,
        ctx: &Context<'_>,
        input: SaveSessionInput,
    ) -> Result<SaveSessionResponse> {
        let supabase = ctx.data::<SupabaseClient>()?;
        
        // Convert events to JSON
        let events: Vec<JsonValue> = input.events.iter().map(|e| {
            json!({
                "type": e.r#type,
                "timestamp": e.timestamp,
                "payload": e.payload.as_ref().cloned().unwrap_or(JsonValue::Null),
            })
        }).collect();
        
        // Convert word responses to JSON
        let word_responses: Vec<JsonValue> = input.word_responses.iter().map(|wr| {
            json!({
                "stimulus_word": wr.stimulus_word,
                "response_word": wr.response_word,
                "reaction_time_ms": wr.reaction_time_ms,
                "is_delayed": wr.is_delayed,
                "timestamp": wr.timestamp.as_deref(),
            })
        }).collect();
        
        let session = supabase.save_session(
            &input.participant_id,
            &events,
            &word_responses,
        ).await
            .map_err(|e| Error::new(format!("Failed to save session: {}", e)))?;
        
        let session_id = session["id"]
            .as_str()
            .ok_or_else(|| Error::new("Session ID not found"))?
            .to_string();
        
        Ok(SaveSessionResponse {
            success: true,
            session_id,
            message: "Session data saved successfully".to_string(),
        })
    }

    /// Save video file to Supabase Storage
    async fn save_video(
        &self,
        ctx: &Context<'_>,
        input: SaveVideoInput,
    ) -> Result<SaveVideoResponse> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let file_url = supabase.save_video(
            &input.participant_id,
            &input.session_id,
            &input.file_name,
            &input.file_data,
        ).await
            .map_err(|e| Error::new(format!("Failed to save video: {}", e)))?;
        
        Ok(SaveVideoResponse {
            success: true,
            file_url: file_url.clone(),
            file_name: input.file_name.clone(),
            message: "Video file saved successfully".to_string(),
        })
    }

    /// Analyze all participants
    async fn analyze_all_participants(
        &self,
        _ctx: &Context<'_>,
    ) -> Result<ActivityExecutionResponse> {
        // This would need to call a batch analyze endpoint if available
        // For now, return an error indicating this needs to be implemented
        Ok(ActivityExecutionResponse {
            success: false,
            result: None,
            error: Some("Batch analysis not yet implemented".to_string()),
        })
    }

    /// Analyze video emotions
    async fn analyze_video_emotions(
        &self,
        _ctx: &Context<'_>,
        input: AnalyzeVideoInput,
    ) -> Result<ActivityExecutionResponse> {
        // This would typically call a Rust analyzer server or researcher functions
        // For now, return an error indicating this needs to be implemented
        Ok(ActivityExecutionResponse {
            success: false,
            result: None,
            error: Some(format!("Video emotion analysis not yet implemented for participant {}", input.participant_id)),
        })
    }
}

