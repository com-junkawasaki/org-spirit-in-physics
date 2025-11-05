//! Activity execution engine
//! 
//! Merkle DAG: activities_rust.execution.engine
//! OWL: spirit:Process execution engine
//! 
//! Executes activities in topological order based on Merkle DAG dependencies.

use std::collections::HashMap;
use crate::models::{Activity, ActivityContext, ActivityExecutionResult};
use crate::error::{ActivityError, ActivityResult};
use crate::execution::ExecutionContext;
use std::time::Instant;

/// Activity execution engine
/// 
/// Merkle DAG: ExecutionEngine
/// OWL: spirit:Process execution engine
pub struct ExecutionEngine {
    activities: HashMap<String, Box<dyn Activity>>,
    context: ExecutionContext,
}

impl ExecutionEngine {
    pub fn new() -> Self {
        Self {
            activities: HashMap::new(),
            context: ExecutionContext::new(),
        }
    }

    /// Register an activity
    pub fn register_activity(&mut self, activity: Box<dyn Activity>) {
        self.activities.insert(activity.id().to_string(), activity);
    }

    /// Execute a single activity
    pub async fn execute_activity(
        &mut self,
        activity_id: &str,
        inputs: Vec<crate::models::ActivityData>,
    ) -> ActivityResult<ActivityExecutionResult> {
        let activity = self.activities.get(activity_id)
            .ok_or_else(|| ActivityError::ExecutionFailed(format!("Activity not found: {}", activity_id)))?;

        let mut context = ActivityContext::with_inputs(inputs);

        // Validate inputs
        activity.validate_inputs(&context.inputs)?;

        // Check conditions
        activity.check_conditions(&context)?;

        // Apply rules
        activity.apply_rules(&mut context)?;

        // Execute activity
        let start = Instant::now();
        let result = activity.execute(&mut context).await?;
        let execution_time = start.elapsed().as_millis() as u64;

        // Store result
        self.context.store_result(result.clone());

        Ok(result)
    }

    /// Execute activities in topological order (Merkle DAG)
    pub async fn execute_workflow(&mut self) -> ActivityResult<Vec<ActivityExecutionResult>> {
        let execution_order = self.context.topological_sort();
        let mut results = Vec::new();

        for activity_id in execution_order {
            if let Some(activity) = self.activities.get(&activity_id) {
                // Get inputs from previous activities
                let inputs = self.get_inputs_for_activity(&activity_id)?;

                let result = self.execute_activity(&activity_id, inputs).await?;
                results.push(result);
            }
        }

        Ok(results)
    }

    /// Get inputs for an activity from previous activity outputs
    fn get_inputs_for_activity(&self, _activity_id: &str) -> ActivityResult<Vec<crate::models::ActivityData>> {
        // TODO: Implement input collection from dependencies
        // For now, return empty inputs
        Ok(Vec::new())
    }

    /// Get execution context
    pub fn context(&self) -> &ExecutionContext {
        &self.context
    }

    /// Get mutable execution context
    pub fn context_mut(&mut self) -> &mut ExecutionContext {
        &mut self.context
    }
}

impl Default for ExecutionEngine {
    fn default() -> Self {
        Self::new()
    }
}

