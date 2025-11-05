//! Supabase REST API client for GraphQL server
//! 
//! Merkle DAG: graphql.storage.supabase
//! OWL: spirit:GraphQL Service Port Supabase integration

use anyhow::{anyhow, Result};
use reqwest::Client;
use serde_json::Value;
use std::env;

pub struct SupabaseClient {
    client: Client,
    url: String,
    service_role_key: String,
}

impl SupabaseClient {
    pub fn new() -> Result<Self> {
        let url = env::var("SUPABASE_URL")
            .or_else(|_| env::var("NEXT_PUBLIC_SUPABASE_URL"))
            .map_err(|_| anyhow!("SUPABASE_URL not set"))?;

        let service_role_key = env::var("SUPABASE_SERVICE_ROLE_KEY")
            .or_else(|_| env::var("SUPABASE_ANON_KEY"))
            .map_err(|_| anyhow!("SUPABASE_SERVICE_ROLE_KEY not set"))?;

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

    /// Get all participants
    pub async fn get_participants(&self) -> Result<Vec<Value>> {
        let url = format!("{}/rest/v1/participants?order=created_at.desc", self.url);
        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch participants: {}", response.status()));
        }

        let data: Vec<Value> = response.json().await?;
        Ok(data)
    }

    /// Get participant by ID
    pub async fn get_participant(&self, participant_id: &str) -> Result<Value> {
        let url = format!("{}/rest/v1/participants?id=eq.{}", self.url, participant_id);
        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch participant: {}", response.status()));
        }

        let data: Vec<Value> = response.json().await?;
        data.into_iter().next()
            .ok_or_else(|| anyhow!("Participant {} not found", participant_id))
    }

    /// Get sessions
    pub async fn get_sessions(&self, participant_id: Option<&str>) -> Result<Vec<Value>> {
        let mut url = format!("{}/rest/v1/participant_experiment_sessions?order=start_time.desc", self.url);
        
        if let Some(pid) = participant_id {
            url = format!("{}/rest/v1/participant_experiment_sessions?participant_id=eq.{}&order=start_time.desc", self.url, pid);
        }

        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch sessions: {}", response.status()));
        }

        let data: Vec<Value> = response.json().await?;
        Ok(data)
    }

    /// Get analysis results
    pub async fn get_analysis_results(
        &self,
        participant_id: Option<&str>,
        experiment_id: Option<&str>,
    ) -> Result<Vec<Value>> {
        let mut url = format!("{}/rest/v1/participant_analysis_results?order=created_at.desc", self.url);
        
        let mut params = Vec::new();
        if let Some(pid) = participant_id {
            params.push(format!("participant_id=eq.{}", pid));
        }
        if let Some(eid) = experiment_id {
            params.push(format!("experiment_id=eq.{}", eid));
        }
        
        if !params.is_empty() {
            url = format!("{}/rest/v1/participant_analysis_results?{}&order=created_at.desc", 
                self.url, params.join("&"));
        }

        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch analysis results: {}", response.status()));
        }

        let data: Vec<Value> = response.json().await?;
        Ok(data)
    }
}

