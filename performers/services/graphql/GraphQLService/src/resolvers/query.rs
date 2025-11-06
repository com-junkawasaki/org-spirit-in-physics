//! GraphQL Query resolvers
//! 
//! Merkle DAG: graphql.resolvers.query
//! OWL: spirit:GraphQL Query resolvers

use async_graphql::*;
use crate::schema::{Participant, Session, AnalysisResult, Consent, SessionEvent, Project, ProjectStats, ProjectParticipant, ExperimentConfig, ProjectWorkflow};
use crate::storage::SupabaseClient;
use serde_json::Value as JsonValue;

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// Get all participants
    async fn participants(&self, ctx: &Context<'_>) -> Result<Vec<Participant>> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let data = supabase.get_participants().await
            .map_err(|e| Error::new(format!("Failed to fetch participants: {}", e)))?;
        
        Ok(data.into_iter().map(Participant::from).collect())
    }

    /// Get participant by ID
    async fn participant(&self, ctx: &Context<'_>, id: String) -> Result<Participant> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let data = supabase.get_participant(&id).await
            .map_err(|e| Error::new(format!("Failed to fetch participant: {}", e)))?;
        
        Ok(Participant::from(data))
    }

    /// Get sessions
    async fn sessions(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "participantId")] participant_id: Option<String>,
    ) -> Result<Vec<Session>> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let data = supabase.get_sessions(participant_id.as_deref()).await
            .map_err(|e| Error::new(format!("Failed to fetch sessions: {}", e)))?;
        
        Ok(data.into_iter().map(Session::from).collect())
    }

    /// Get analysis results
    async fn analysis_results(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "participantId")] participant_id: Option<String>,
        #[graphql(name = "experimentId")] experiment_id: Option<String>,
    ) -> Result<Vec<AnalysisResult>> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let data = supabase.get_analysis_results(
            participant_id.as_deref(),
            experiment_id.as_deref(),
        ).await
            .map_err(|e| Error::new(format!("Failed to fetch analysis results: {}", e)))?;
        
        Ok(data.into_iter().map(AnalysisResult::from).collect())
    }

    /// Get consent for a participant
    async fn consent(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "participantId")] participant_id: String,
    ) -> Result<Option<Consent>> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let data = supabase.get_consent(&participant_id).await
            .map_err(|e| Error::new(format!("Failed to fetch consent: {}", e)))?;
        
        Ok(data.map(Consent::from))
    }

    /// Get sessions by participant ID
    async fn sessions_by_participant(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "participantId")] participant_id: String,
    ) -> Result<Vec<Session>> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let data = supabase.get_sessions_by_participant(&participant_id).await
            .map_err(|e| Error::new(format!("Failed to fetch sessions: {}", e)))?;
        
        Ok(data.into_iter().map(Session::from).collect())
    }

    /// Get session events
    async fn session_events(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "participantId")] participant_id: String,
        #[graphql(name = "sessionId")] session_id: String,
    ) -> Result<Vec<SessionEvent>> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let data = supabase.get_session_events(&participant_id, &session_id).await
            .map_err(|e| Error::new(format!("Failed to fetch session events: {}", e)))?;
        
        Ok(data.into_iter().map(SessionEvent::from).collect())
    }

    /// Get emotion results for a participant
    async fn emotion_results(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "participantId")] participant_id: String,
    ) -> Result<Vec<JsonValue>> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let data = supabase.get_emotion_results(&participant_id).await
            .map_err(|e| Error::new(format!("Failed to fetch emotion results: {}", e)))?;
        
        Ok(data)
    }

    /// Get emotion statistics
    async fn emotion_statistics(&self, ctx: &Context<'_>) -> Result<JsonValue> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let data = supabase.get_emotion_statistics().await
            .map_err(|e| Error::new(format!("Failed to fetch emotion statistics: {}", e)))?;
        
        Ok(data)
    }

    /// Get all projects
    async fn projects(
        &self,
        ctx: &Context<'_>,
        status: Option<String>,
        #[graphql(name = "createdBy")] created_by: Option<String>,
        search: Option<String>,
    ) -> Result<Vec<Project>> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let data = supabase.get_projects(
            status.as_deref(),
            created_by.as_deref(),
            search.as_deref(),
        ).await
            .map_err(|e| Error::new(format!("Failed to fetch projects: {}", e)))?;
        
        Ok(data.into_iter().map(Project::from).collect())
    }

    /// Get project by ID
    async fn project(&self, ctx: &Context<'_>, id: String) -> Result<Project> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let data = supabase.get_project(&id).await
            .map_err(|e| Error::new(format!("Failed to fetch project: {}", e)))?;
        
        Ok(Project::from(data))
    }

    /// Get project stats
    async fn project_stats(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "projectId")] project_id: String,
    ) -> Result<Option<ProjectStats>> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let data = supabase.get_project_stats(&project_id).await
            .map_err(|e| Error::new(format!("Failed to fetch project stats: {}", e)))?;
        
        Ok(data.map(ProjectStats::from))
    }

    /// Get project participants
    async fn project_participants(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "projectId")] project_id: String,
    ) -> Result<Vec<ProjectParticipant>> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let data = supabase.get_project_participants(&project_id).await
            .map_err(|e| Error::new(format!("Failed to fetch project participants: {}", e)))?;
        
        Ok(data.into_iter().map(|pp| {
            let participant = pp.get("participant").cloned().map(|p| {
                crate::schema::project::ParticipantRef {
                    id: p["id"].as_str().unwrap_or("").to_string(),
                    name: p["name"].as_str().map(|s| s.to_string()),
                    created_at: p["created_at"].as_str().unwrap_or("").to_string(),
                }
            });
            
            ProjectParticipant {
                project_id: pp["project_id"].as_str().unwrap_or("").to_string(),
                participant_id: pp["participant_id"].as_str().unwrap_or("").to_string(),
                joined_at: pp["joined_at"].as_str().unwrap_or("").to_string(),
                participant,
            }
        }).collect())
    }

    /// Get experiment config
    async fn experiment_config(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "projectId")] project_id: String,
    ) -> Result<Option<ExperimentConfig>> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let data = supabase.get_experiment_config(&project_id).await
            .map_err(|e| Error::new(format!("Failed to fetch experiment config: {}", e)))?;
        
        Ok(data.map(ExperimentConfig::from))
    }

    /// Get project workflow
    async fn project_workflow(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "projectId")] project_id: String,
    ) -> Result<Option<ProjectWorkflow>> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let data = supabase.get_project_workflow(&project_id).await
            .map_err(|e| Error::new(format!("Failed to fetch project workflow: {}", e)))?;
        
        Ok(data.map(|w| ProjectWorkflow {
            project_id: w["project_id"].as_str().unwrap_or("").to_string(),
            workflow_data: w["workflow_data"].clone(),
            created_at: w["created_at"].as_str().unwrap_or("").to_string(),
            updated_at: w["updated_at"].as_str().unwrap_or("").to_string(),
        }))
    }
}

