//! GraphQL Mutation resolvers
//! 
//! Merkle DAG: graphql.resolvers.mutation
//! OWL: spirit:GraphQL Mutation resolvers

use async_graphql::*;
use crate::schema::{
    ActivityExecutionResponse, Participant, Consent, SaveSessionResponse, SaveVideoResponse,
    CreateParticipantInput, ConsentInput, SaveSessionInput, SaveVideoInput, AnalyzeVideoInput,
    Project, ExperimentConfig, ProjectWorkflow, CreateProjectInput, UpdateProjectInput, ExperimentConfigInput,
};
use crate::storage::SupabaseClient;
use reqwest::Client;
use serde_json::{json, Value as JsonValue};
use std::env;
use std::sync::Arc;
use spirit_activities::{
    Activity, ActivityContext, ActivityData, ActivityExecutionResult,
    DataCollectionActivity, DataStorageActivity, AnalysisProcessActivity,
    TimelineIntegrationActivity, VisualizationProcessActivity, DataImportActivity,
};

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Execute an activity using activities library directly
    async fn execute_activity(
        &self,
        _ctx: &Context<'_>,
        activity_id: String,
        inputs: JsonValue,
    ) -> Result<ActivityExecutionResponse> {
        // Convert JSON inputs to ActivityData
        let input_data: Vec<ActivityData> = if let Some(inputs_array) = inputs.as_array() {
            inputs_array.iter()
                .filter_map(|v| {
                    if let Some(obj) = v.as_object() {
                        Some(ActivityData {
                            id: obj.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                            r#type: obj.get("type").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                            data: obj.get("data").cloned().unwrap_or(json!({})),
                        })
                    } else {
                        None
                    }
                })
                .collect()
        } else {
            Vec::new()
        };

        // Create activity instance based on activity_id
        let activity_result: spirit_activities::ActivityResult<ActivityExecutionResult> = match activity_id.as_str() {
            "https://spirit-in-physics.gftd.ai/activity/DataCollection" => {
                let activity = DataCollectionActivity::new();
                let mut context = ActivityContext::with_inputs(input_data);
                activity.validate_inputs(&context.inputs)?;
                activity.check_conditions(&context)?;
                activity.apply_rules(&mut context)?;
                activity.execute(&mut context).await
            }
            "https://spirit-in-physics.gftd.ai/activity/DataStorage" => {
                let supabase_url = env::var("SUPABASE_URL")
                    .or_else(|_| env::var("NEXT_PUBLIC_SUPABASE_URL"))
                    .unwrap_or_else(|_| "http://localhost:54321".to_string());
                let supabase_key = env::var("SUPABASE_SERVICE_ROLE_KEY")
                    .or_else(|_| env::var("SUPABASE_ANON_KEY"))
                    .unwrap_or_default();
                
                let activity = DataStorageActivity::new(supabase_url, supabase_key);
                let mut context = ActivityContext::with_inputs(input_data);
                activity.validate_inputs(&context.inputs)?;
                activity.check_conditions(&context)?;
                activity.apply_rules(&mut context)?;
                activity.execute(&mut context).await
            }
            "https://spirit-in-physics.gftd.ai/activity/AnalysisProcess" => {
                let activity = AnalysisProcessActivity::new();
                let mut context = ActivityContext::with_inputs(input_data);
                activity.validate_inputs(&context.inputs)?;
                activity.check_conditions(&context)?;
                activity.apply_rules(&mut context)?;
                activity.execute(&mut context).await
            }
            "https://spirit-in-physics.gftd.ai/activity/DataImport" => {
                let activity = DataImportActivity::new();
                let mut context = ActivityContext::with_inputs(input_data);
                activity.validate_inputs(&context.inputs)?;
                activity.check_conditions(&context)?;
                activity.apply_rules(&mut context)?;
                activity.execute(&mut context).await
            }
            "https://spirit-in-physics.gftd.ai/activity/TimelineIntegration" => {
                let activity = TimelineIntegrationActivity::new();
                let mut context = ActivityContext::with_inputs(input_data);
                activity.validate_inputs(&context.inputs)?;
                activity.check_conditions(&context)?;
                activity.apply_rules(&mut context)?;
                activity.execute(&mut context).await
            }
            "https://spirit-in-physics.gftd.ai/activity/VisualizationProcess" => {
                let activity = VisualizationProcessActivity::new();
                let mut context = ActivityContext::with_inputs(input_data);
                activity.validate_inputs(&context.inputs)?;
                activity.check_conditions(&context)?;
                activity.apply_rules(&mut context)?;
                activity.execute(&mut context).await
            }
            _ => {
                return Ok(ActivityExecutionResponse {
                    success: false,
                    result: None,
                    error: Some(format!("Unknown activity ID: {}", activity_id)),
                });
            }
        };

        match activity_result {
            Ok(result) => {
                Ok(ActivityExecutionResponse {
                    success: result.success,
                    result: Some(json!({
                        "activityId": result.activity_id,
                        "success": result.success,
                        "outputs": result.outputs.iter().map(|o| json!({
                            "id": o.id,
                            "type": o.r#type,
                            "data": o.data,
                        })).collect::<Vec<_>>(),
                        "error": result.error,
                        "executionTimeMs": result.execution_time_ms,
                        "timestamp": result.timestamp.to_rfc3339(),
                    })),
                    error: result.error,
                })
            }
            Err(e) => {
                Ok(ActivityExecutionResponse {
                    success: false,
                    result: None,
                    error: Some(format!("Activity execution failed: {}", e)),
                })
            }
        }
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
        let supabase = ctx.data::<Arc<SupabaseClient>>()?;
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
        let supabase = ctx.data::<Arc<SupabaseClient>>()?;
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
        let supabase = ctx.data::<Arc<SupabaseClient>>()?;
        
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
        let supabase = ctx.data::<Arc<SupabaseClient>>()?;
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

    /// Create a new project
    async fn create_project(
        &self,
        ctx: &Context<'_>,
        input: CreateProjectInput,
    ) -> Result<Project> {
        let supabase = ctx.data::<Arc<SupabaseClient>>()?;
        let data = supabase.create_project(
            &input.name,
            input.description.as_deref(),
            input.purpose.as_deref(),
            input.status.as_deref().unwrap_or("planning"),
            input.created_by.as_deref().unwrap_or("system"),
        ).await
            .map_err(|e| Error::new(format!("Failed to create project: {}", e)))?;
        
        Ok(Project::from(data))
    }

    /// Update project
    async fn update_project(
        &self,
        ctx: &Context<'_>,
        id: String,
        input: UpdateProjectInput,
    ) -> Result<Project> {
        let supabase = ctx.data::<Arc<SupabaseClient>>()?;
        let data = supabase.update_project(
            &id,
            input.name.as_deref(),
            input.description.as_deref(),
            input.purpose.as_deref(),
            input.status.as_deref(),
        ).await
            .map_err(|e| Error::new(format!("Failed to update project: {}", e)))?;
        
        Ok(Project::from(data))
    }

    /// Delete project
    async fn delete_project(
        &self,
        ctx: &Context<'_>,
        id: String,
    ) -> Result<bool> {
        let supabase = ctx.data::<Arc<SupabaseClient>>()?;
        supabase.delete_project(&id).await
            .map_err(|e| Error::new(format!("Failed to delete project: {}", e)))?;
        
        Ok(true)
    }

    /// Add participant to project
    async fn add_participant_to_project(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "projectId")] project_id: String,
        #[graphql(name = "participantId")] participant_id: String,
    ) -> Result<bool> {
        let supabase = ctx.data::<Arc<SupabaseClient>>()?;
        supabase.add_participant_to_project(&project_id, &participant_id).await
            .map_err(|e| Error::new(format!("Failed to add participant to project: {}", e)))?;
        
        Ok(true)
    }

    /// Remove participant from project
    async fn remove_participant_from_project(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "projectId")] project_id: String,
        #[graphql(name = "participantId")] participant_id: String,
    ) -> Result<bool> {
        let supabase = ctx.data::<Arc<SupabaseClient>>()?;
        supabase.remove_participant_from_project(&project_id, &participant_id).await
            .map_err(|e| Error::new(format!("Failed to remove participant from project: {}", e)))?;
        
        Ok(true)
    }

    /// Save experiment config
    async fn save_experiment_config(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "projectId")] project_id: String,
        input: ExperimentConfigInput,
    ) -> Result<ExperimentConfig> {
        let supabase = ctx.data::<Arc<SupabaseClient>>()?;
        let config_data = json!({
            "session_types": input.session_types,
            "word_list": input.word_list,
            "session_parameters": input.session_parameters,
            "analysis_parameters": input.analysis_parameters,
        });
        
        let data = supabase.save_experiment_config(&project_id, &config_data).await
            .map_err(|e| Error::new(format!("Failed to save experiment config: {}", e)))?;
        
        Ok(ExperimentConfig::from(data))
    }

    /// Save project workflow
    async fn save_project_workflow(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "projectId")] project_id: String,
        #[graphql(name = "workflowData")] workflow_data: JsonValue,
    ) -> Result<ProjectWorkflow> {
        let supabase = ctx.data::<Arc<SupabaseClient>>()?;
        let data = supabase.save_project_workflow(&project_id, &workflow_data).await
            .map_err(|e| Error::new(format!("Failed to save project workflow: {}", e)))?;
        
        Ok(ProjectWorkflow {
            project_id: data["project_id"].as_str().unwrap_or("").to_string(),
            workflow_data: data["workflow_data"].clone(),
            created_at: data["created_at"].as_str().unwrap_or("").to_string(),
            updated_at: data["updated_at"].as_str().unwrap_or("").to_string(),
        })
    }
}

