//! Activity model definitions
//! 
//! Merkle DAG: activities_rust.models.activity
//! OWL: spirit:Activity, spirit:Process
//! 
//! Defines the Activity trait and related data structures based on JSON-LD definitions.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

/// Activity input/output data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityData {
    pub id: String,
    pub r#type: String,
    pub data: serde_json::Value,
}

/// Activity execution context
#[derive(Debug, Clone)]
pub struct ActivityContext {
    /// Activity inputs
    pub inputs: Vec<ActivityData>,
    /// Activity outputs (populated after execution)
    pub outputs: Vec<ActivityData>,
    /// State storage for activity execution
    pub state: HashMap<String, serde_json::Value>,
    /// Metadata
    pub metadata: HashMap<String, String>,
}

impl ActivityContext {
    pub fn new() -> Self {
        Self {
            inputs: Vec::new(),
            outputs: Vec::new(),
            state: HashMap::new(),
            metadata: HashMap::new(),
        }
    }

    pub fn with_inputs(inputs: Vec<ActivityData>) -> Self {
        Self {
            inputs,
            outputs: Vec::new(),
            state: HashMap::new(),
            metadata: HashMap::new(),
        }
    }
}

impl Default for ActivityContext {
    fn default() -> Self {
        Self::new()
    }
}

/// Activity execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityExecutionResult {
    pub activity_id: String,
    pub success: bool,
    pub outputs: Vec<ActivityData>,
    pub error: Option<String>,
    pub execution_time_ms: u64,
    pub timestamp: DateTime<Utc>,
}

use async_trait::async_trait;

/// Activity trait - all activities must implement this
/// 
/// Merkle DAG: Activity trait definition
/// OWL: spirit:Process
#[async_trait]
pub trait Activity: Send + Sync {
    /// Activity identifier (matches JSON-LD @id)
    fn id(&self) -> &str;

    /// Activity name
    fn name(&self) -> &str;

    /// Activity description
    fn description(&self) -> &str;

    /// Execute the activity
    /// 
    /// Merkle DAG: activity execution
    /// OWL: spirit:Process execution
    async fn execute(&self, context: &mut ActivityContext) -> crate::ActivityResult<ActivityExecutionResult>;

    /// Validate activity inputs
    fn validate_inputs(&self, inputs: &[ActivityData]) -> crate::ActivityResult<()>;

    /// Check activity conditions
    fn check_conditions(&self, context: &ActivityContext) -> crate::ActivityResult<()>;

    /// Apply activity rules
    fn apply_rules(&self, context: &mut ActivityContext) -> crate::ActivityResult<()>;
}

