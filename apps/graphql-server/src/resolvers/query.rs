//! GraphQL Query resolvers
//! 
//! Merkle DAG: graphql.resolvers.query
//! OWL: spirit:GraphQL Query resolvers

use async_graphql::*;
use crate::schema::{Participant, Session, AnalysisResult, Consent, SessionEvent};
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
        participant_id: Option<String>,
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
        participant_id: Option<String>,
        experiment_id: Option<String>,
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
    async fn consent(&self, ctx: &Context<'_>, participant_id: String) -> Result<Option<Consent>> {
        let supabase = ctx.data::<SupabaseClient>()?;
        let data = supabase.get_consent(&participant_id).await
            .map_err(|e| Error::new(format!("Failed to fetch consent: {}", e)))?;
        
        Ok(data.map(Consent::from))
    }

    /// Get sessions by participant ID
    async fn sessions_by_participant(
        &self,
        ctx: &Context<'_>,
        participant_id: String,
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
        participant_id: String,
        session_id: String,
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
        participant_id: String,
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
}

