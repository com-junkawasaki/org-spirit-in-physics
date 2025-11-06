//! Visualization Process Activity
//! 
//! Merkle DAG: activities_rust.activities.visualization_process
//! OWL: spirit:VisualizationProcess
//! JSON-LD: https://spirit-in-physics.gftd.ai/activity/VisualizationProcess

use crate::models::{Activity, ActivityContext, ActivityData, ActivityExecutionResult};
use crate::error::{ActivityError, ActivityResult};
use async_trait::async_trait;
use chrono::Utc;
use serde_json::json;

/// Visualization Process Activity
/// 
/// Visualizes data in 3D Force Timeline using emotion-kernel tensegrity model
pub struct VisualizationProcessActivity;

impl VisualizationProcessActivity {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Activity for VisualizationProcessActivity {
    fn id(&self) -> &str {
        "https://spirit-in-physics.gftd.ai/activity/VisualizationProcess"
    }

    fn name(&self) -> &str {
        "Visualization Process"
    }

    fn description(&self) -> &str {
        "Activity for visualizing data in 3D Force Timeline using emotion-kernel tensegrity model"
    }

    async fn execute(&self, context: &mut ActivityContext) -> ActivityResult<ActivityExecutionResult> {
        let start_time = std::time::Instant::now();

        // Get timeline data
        let timeline_data: Vec<_> = context.inputs.iter()
            .filter(|input| input.r#type == "https://spirit-in-physics.gftd.ai/ontology#TimelineData")
            .cloned()
            .collect();

        if timeline_data.is_empty() {
            return Err(ActivityError::InvalidInput(
                "Timeline data is required for visualization".to_string()
            ));
        }

        // Prepare visualization data
        // Visualization must use emotion-kernel distance metric and tensegrity physics
        let visualization_config = json!({
            "type": "3D Force Timeline",
            "model": "emotion-kernel-tensegrity",
            "parameters": {
                "sigma": 1.0,
                "spectralInit": true,
                "shellRadius": 100.0,
                "constraintIters": 10,
            },
        });

        let outputs = vec![
            ActivityData {
                id: "visualization".to_string(),
                r#type: "https://spirit-in-physics.gftd.ai/output/3DForceTimelineVisualization".to_string(),
                data: json!({
                    "config": visualization_config,
                    "timeline_data": timeline_data,
                    "ready": true,
                }),
            },
        ];

        context.outputs = outputs.clone();

        let execution_time = start_time.elapsed().as_millis() as u64;

        Ok(ActivityExecutionResult {
            activity_id: self.id().to_string(),
            success: true,
            outputs,
            error: None,
            execution_time_ms: execution_time,
            timestamp: Utc::now(),
        })
    }

    fn validate_inputs(&self, inputs: &[ActivityData]) -> ActivityResult<()> {
        // Timeline data must be properly integrated before visualization
        let has_timeline_data = inputs.iter()
            .any(|input| input.r#type == "https://spirit-in-physics.gftd.ai/ontology#TimelineData");

        if !has_timeline_data {
            return Err(ActivityError::InvalidInput(
                "Timeline data is required".to_string()
            ));
        }

        Ok(())
    }

    fn check_conditions(&self, context: &ActivityContext) -> ActivityResult<()> {
        // Timeline data must be properly integrated before visualization
        self.validate_inputs(&context.inputs)
    }

    fn apply_rules(&self, _context: &mut ActivityContext) -> ActivityResult<()> {
        // Visualization must use emotion-kernel distance metric and tensegrity physics
        // This is enforced in execute() method via visualization_config
        Ok(())
    }
}

impl Default for VisualizationProcessActivity {
    fn default() -> Self {
        Self::new()
    }
}

