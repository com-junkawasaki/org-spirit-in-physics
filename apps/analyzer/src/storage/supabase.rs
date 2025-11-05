//! Supabase REST API client
//! 
//! Merkle DAG: analyzer.storage.supabase
//! OWL: spirit:AnalysisPipeline Supabase integration

use crate::error::{AnalyzerError, AnalyzerResult};
use crate::models::{Participant, Session, WordResponse, AnalysisResult};
use reqwest::Client;
use serde_json::json;
use std::env;

pub struct SupabaseClient {
    client: Client,
    url: String,
    service_role_key: String,
}

impl SupabaseClient {
    pub fn new() -> AnalyzerResult<Self> {
        let url = env::var("SUPABASE_URL")
            .or_else(|_| env::var("NEXT_PUBLIC_SUPABASE_URL"))
            .map_err(|_| AnalyzerError::MissingData("SUPABASE_URL not set".to_string()))?;

        let service_role_key = env::var("SUPABASE_SERVICE_ROLE_KEY")
            .or_else(|_| env::var("SUPABASE_ANON_KEY"))
            .map_err(|_| AnalyzerError::MissingData("SUPABASE_SERVICE_ROLE_KEY not set".to_string()))?;

        Ok(Self {
            client: Client::new(),
            url,
            service_role_key,
        })
    }

    fn headers(&self) -> reqwest::header::HeaderMap {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
            "apikey",
            self.service_role_key.parse().unwrap(),
        );
        headers.insert(
            "Authorization",
            format!("Bearer {}", self.service_role_key).parse().unwrap(),
        );
        headers.insert(
            "Content-Type",
            "application/json".parse().unwrap(),
        );
        headers.insert(
            "Prefer",
            "return=representation".parse().unwrap(),
        );
        headers
    }

    /// Get participant by ID
    pub async fn get_participant(&self, participant_id: &str) -> AnalyzerResult<Participant> {
        let url = format!("{}/rest/v1/participants?id=eq.{}", self.url, participant_id);
        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await
            .map_err(|e| AnalyzerError::HttpError(e.to_string()))?;

        if !response.status().is_success() {
            return Err(AnalyzerError::SupabaseError(
                format!("Failed to fetch participant: {}", response.status())
            ));
        }

        let participants: Vec<Participant> = response.json().await
            .map_err(|e| AnalyzerError::SerializationError(e.to_string()))?;

        participants.into_iter().next()
            .ok_or_else(|| AnalyzerError::MissingData(format!("Participant {} not found", participant_id)))
    }

    /// Get sessions by participant ID
    pub async fn get_sessions(&self, participant_id: &str) -> AnalyzerResult<Vec<Session>> {
        let url = format!("{}/rest/v1/participant_experiment_sessions?participant_id=eq.{}", self.url, participant_id);
        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await
            .map_err(|e| AnalyzerError::HttpError(e.to_string()))?;

        if !response.status().is_success() {
            return Err(AnalyzerError::SupabaseError(
                format!("Failed to fetch sessions: {}", response.status())
            ));
        }

        let sessions: Vec<Session> = response.json().await
            .map_err(|e| AnalyzerError::SerializationError(e.to_string()))?;

        Ok(sessions)
    }

    /// Get word responses by participant ID
    pub async fn get_word_responses(&self, participant_id: &str) -> AnalyzerResult<Vec<WordResponse>> {
        let url = format!("{}/rest/v1/participant_response_data?participant_id=eq.{}", self.url, participant_id);
        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await
            .map_err(|e| AnalyzerError::HttpError(e.to_string()))?;

        if !response.status().is_success() {
            return Err(AnalyzerError::SupabaseError(
                format!("Failed to fetch word responses: {}", response.status())
            ));
        }

        let responses: Vec<WordResponse> = response.json().await
            .map_err(|e| AnalyzerError::SerializationError(e.to_string()))?;

        Ok(responses)
    }

    /// Save analysis results
    pub async fn save_analysis_results(&self, results: &[AnalysisResult]) -> AnalyzerResult<()> {
        if results.is_empty() {
            return Ok(());
        }

        let url = format!("{}/rest/v1/participant_analysis_results", self.url);
        
        // Convert to JSON for Supabase
        let json_results: Vec<serde_json::Value> = results.iter().map(|r| {
            json!({
                "participant_id": r.participant_id,
                "experiment_id": r.experiment_id,
                "word_stimulus_id": r.word_stimulus_id,
                "stimulus_word": r.stimulus_word,
                "response_word": r.response_word,
                "reaction_time_ms": r.reaction_time_ms,
                "spirit_probability": r.spirit_probability,
                "word2vec_component": r.word2vec_component,
                "reaction_time_component": r.reaction_time_component,
                "skin_potential_component": r.skin_potential_component,
                "emotion_component": r.emotion_component,
                "emotion_data": r.emotion_data,
                "physiological_data": r.physiological_data,
            })
        }).collect();

        let response = self.client
            .post(&url)
            .headers(self.headers())
            .json(&json_results)
            .send()
            .await
            .map_err(|e| AnalyzerError::HttpError(e.to_string()))?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AnalyzerError::SupabaseError(
                format!("Failed to save analysis results: {} - {}", status, error_text)
            ));
        }

        Ok(())
    }
}

