//! Activity Execution Response GraphQL type
//! 
//! Merkle DAG: graphql.schema.activity
//! OWL: spirit:ActivityExecutionResponse

use async_graphql::*;
use serde_json::Value as JsonValue;

#[derive(SimpleObject, Clone, Debug)]
pub struct ActivityExecutionResponse {
    pub success: bool,
    pub result: Option<JsonValue>,
    pub error: Option<String>,
}

impl From<serde_json::Value> for ActivityExecutionResponse {
    fn from(value: serde_json::Value) -> Self {
        ActivityExecutionResponse {
            success: value["success"].as_bool().unwrap_or(false),
            result: value.get("result").cloned(),
            error: value["error"].as_str().map(|s| s.to_string()),
        }
    }
}

