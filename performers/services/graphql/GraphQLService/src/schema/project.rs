//! Project GraphQL type
//! 
//! Merkle DAG: graphql.schema.project
//! OWL: spirit:Project

use async_graphql::*;
use serde_json::Value as JsonValue;

#[derive(SimpleObject, Clone, Debug)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub purpose: Option<String>,
    pub status: String,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
    #[graphql(name = "createdBy")]
    pub created_by: String,
}

#[derive(SimpleObject, Clone, Debug)]
pub struct ProjectStats {
    #[graphql(name = "projectId")]
    pub project_id: String,
    #[graphql(name = "totalParticipants")]
    pub total_participants: i32,
    #[graphql(name = "totalSessions")]
    pub total_sessions: i32,
    #[graphql(name = "totalResponses")]
    pub total_responses: i32,
    #[graphql(name = "activeSessions")]
    pub active_sessions: i32,
    #[graphql(name = "completedAnalyses")]
    pub completed_analyses: i32,
    #[graphql(name = "averageSpiritProbability")]
    pub average_spirit_probability: f64,
}

#[derive(SimpleObject, Clone, Debug)]
pub struct ProjectParticipant {
    #[graphql(name = "projectId")]
    pub project_id: String,
    #[graphql(name = "participantId")]
    pub participant_id: String,
    #[graphql(name = "joinedAt")]
    pub joined_at: String,
    pub participant: Option<ParticipantRef>,
}

#[derive(SimpleObject, Clone, Debug)]
pub struct ParticipantRef {
    pub id: String,
    pub name: Option<String>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
}

#[derive(SimpleObject, Clone, Debug)]
pub struct ExperimentConfig {
    #[graphql(name = "projectId")]
    pub project_id: String,
    #[graphql(name = "sessionTypes")]
    pub session_types: Vec<String>,
    #[graphql(name = "wordList")]
    pub word_list: Vec<String>,
    #[graphql(name = "sessionParameters")]
    pub session_parameters: JsonValue,
    #[graphql(name = "analysisParameters")]
    pub analysis_parameters: JsonValue,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

#[derive(SimpleObject, Clone, Debug)]
pub struct ProjectWorkflow {
    #[graphql(name = "projectId")]
    pub project_id: String,
    #[graphql(name = "workflowData")]
    pub workflow_data: JsonValue,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

#[derive(InputObject, Debug)]
pub struct CreateProjectInput {
    pub name: String,
    pub description: Option<String>,
    pub purpose: Option<String>,
    pub status: Option<String>,
    #[graphql(name = "createdBy")]
    pub created_by: Option<String>,
}

#[derive(InputObject, Debug)]
pub struct UpdateProjectInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub purpose: Option<String>,
    pub status: Option<String>,
}

#[derive(InputObject, Debug)]
pub struct ExperimentConfigInput {
    #[graphql(name = "sessionTypes")]
    pub session_types: Vec<String>,
    #[graphql(name = "wordList")]
    pub word_list: Vec<String>,
    #[graphql(name = "sessionParameters")]
    pub session_parameters: JsonValue,
    #[graphql(name = "analysisParameters")]
    pub analysis_parameters: JsonValue,
}

impl From<JsonValue> for Project {
    fn from(value: JsonValue) -> Self {
        Project {
            id: value["id"].as_str().unwrap_or("").to_string(),
            name: value["name"].as_str().unwrap_or("").to_string(),
            description: value["description"].as_str().map(|s| s.to_string()),
            purpose: value["purpose"].as_str().map(|s| s.to_string()),
            status: value["status"].as_str().unwrap_or("planning").to_string(),
            created_at: value["created_at"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            updated_at: value["updated_at"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            created_by: value["created_by"]
                .as_str()
                .unwrap_or("")
                .to_string(),
        }
    }
}

impl From<JsonValue> for ProjectStats {
    fn from(value: JsonValue) -> Self {
        ProjectStats {
            project_id: value["project_id"].as_str().unwrap_or("").to_string(),
            total_participants: value["total_participants"]
                .as_i64()
                .unwrap_or(0) as i32,
            total_sessions: value["total_sessions"].as_i64().unwrap_or(0) as i32,
            total_responses: value["total_responses"].as_i64().unwrap_or(0) as i32,
            active_sessions: value["active_sessions"].as_i64().unwrap_or(0) as i32,
            completed_analyses: value["completed_analyses"]
                .as_i64()
                .unwrap_or(0) as i32,
            average_spirit_probability: value["average_spirit_probability"]
                .as_f64()
                .unwrap_or(0.0),
        }
    }
}

impl From<JsonValue> for ExperimentConfig {
    fn from(value: JsonValue) -> Self {
        ExperimentConfig {
            project_id: value["project_id"].as_str().unwrap_or("").to_string(),
            session_types: value["session_types"]
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default(),
            word_list: value["word_list"]
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default(),
            session_parameters: value["session_parameters"].clone(),
            analysis_parameters: value["analysis_parameters"].clone(),
            created_at: value["created_at"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            updated_at: value["updated_at"]
                .as_str()
                .unwrap_or("")
                .to_string(),
        }
    }
}

