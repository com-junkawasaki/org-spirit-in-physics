//! GraphQL Mutation resolvers
//! 
//! Merkle DAG: graphql.resolvers.mutation
//! OWL: spirit:GraphQL Mutation resolvers

use async_graphql::*;
use crate::schema::ActivityExecutionResponse;
use reqwest::Client;
use serde_json::{json, Value as JsonValue};
use std::env;

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Execute an activity via Rust activities server
    async fn execute_activity(
        &self,
        ctx: &Context<'_>,
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
        ctx: &Context<'_>,
        participant_id: String,
        experiment_id: Option<String>,
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

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Ok(ActivityExecutionResponse {
                success: false,
                result: None,
                error: Some(format!("Analyzer server error: {} - {}", response.status(), error_text)),
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
}

