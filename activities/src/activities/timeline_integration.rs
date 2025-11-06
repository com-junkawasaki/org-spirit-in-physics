//! Timeline Integration Activity
//! 
//! Merkle DAG: activities_rust.activities.timeline_integration
//! OWL: spirit:TimelineIntegrationProcess
//! JSON-LD: https://spirit-in-physics.gftd.ai/activity/TimelineIntegration

use crate::models::{Activity, ActivityContext, ActivityData, ActivityExecutionResult};
use crate::error::{ActivityError, ActivityResult};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde_json::json;

/// Timeline Integration Activity
/// 
/// Integrates time-series data from session events, emotion data, and physiological data
pub struct TimelineIntegrationActivity;

impl TimelineIntegrationActivity {
    pub fn new() -> Self {
        Self
    }

    /// Match emotion data to session event by time range
    /// Rule: emotion.beginTime <= relativeTimestamp <= emotion.endTime
    fn match_emotion_to_event(
        &self,
        event_timestamp: &DateTime<Utc>,
        emotion_begin: &DateTime<Utc>,
        emotion_end: &DateTime<Utc>,
    ) -> bool {
        emotion_begin <= event_timestamp && event_timestamp <= emotion_end
    }
}

#[async_trait]
impl Activity for TimelineIntegrationActivity {
    fn id(&self) -> &str {
        "https://spirit-in-physics.gftd.ai/activity/TimelineIntegration"
    }

    fn name(&self) -> &str {
        "Timeline Integration"
    }

    fn description(&self) -> &str {
        "Activity for integrating time-series data from session events, emotion data, and physiological data"
    }

    async fn execute(&self, context: &mut ActivityContext) -> ActivityResult<ActivityExecutionResult> {
        let start_time = std::time::Instant::now();

        // Get session events
        let session_events: Vec<_> = context.inputs.iter()
            .filter(|input| input.r#type == "https://spirit-in-physics.gftd.ai/ontology#SessionEvent")
            .cloned()
            .collect();

        // Get emotion data
        let emotion_data: Vec<_> = context.inputs.iter()
            .filter(|input| input.r#type == "https://spirit-in-physics.gftd.ai/ontology#EmotionData")
            .cloned()
            .collect();

        // Get physiological data
        let physiological_data: Vec<_> = context.inputs.iter()
            .filter(|input| input.r#type == "https://spirit-in-physics.gftd.ai/ontology#PhysiologicalData")
            .cloned()
            .collect();

        // Integrate data by timestamp
        let mut timeline_points = Vec::new();

        for event in &session_events {
            if let Some(event_obj) = event.data.as_object() {
                // Parse timestamp
                let timestamp_str = event_obj.get("timestamp")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| ActivityError::InvalidInput(
                        "Session event must have timestamp".to_string()
                    ))?;

                let timestamp = DateTime::parse_from_rfc3339(timestamp_str)
                    .map_err(|e| ActivityError::InvalidInput(
                        format!("Invalid timestamp format: {}", e)
                    ))?
                    .with_timezone(&Utc);

                // Find matching emotion data
                let matched_emotions: Vec<_> = emotion_data.iter()
                    .filter_map(|emotion| {
                        if let Some(emotion_obj) = emotion.data.as_object() {
                            let begin_str = emotion_obj.get("beginTime")?.as_str()?;
                            let end_str = emotion_obj.get("endTime")?.as_str()?;
                            
                            let begin = DateTime::parse_from_rfc3339(begin_str).ok()?.with_timezone(&Utc);
                            let end = DateTime::parse_from_rfc3339(end_str).ok()?.with_timezone(&Utc);

                            if self.match_emotion_to_event(&timestamp, &begin, &end) {
                                Some(emotion_obj.clone())
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    })
                    .collect();

                // Find matching physiological data (simplified - match by timestamp proximity)
                let matched_physiological = physiological_data.iter()
                    .find(|physio| {
                        // TODO: Implement proper time range matching for physiological data
                        true
                    })
                    .and_then(|p| p.data.as_object())
                    .cloned();

                // Create timeline data point
                timeline_points.push(json!({
                    "timestamp": timestamp_str,
                    "word": event_obj.get("word"),
                    "eventType": event_obj.get("eventType"),
                    "emotions": matched_emotions,
                    "physiological": matched_physiological,
                    "reactionValue": event_obj.get("reactionValue"),
                }));
            }
        }

        let outputs = vec![
            ActivityData {
                id: "timeline_data".to_string(),
                r#type: "https://spirit-in-physics.gftd.ai/ontology#TimelineData".to_string(),
                data: json!({
                    "points": timeline_points,
                    "total_points": timeline_points.len(),
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
        // All input data must have valid timestamps for integration
        for input in inputs {
            if let Some(obj) = input.data.as_object() {
                if obj.contains_key("timestamp") {
                    let timestamp_str = obj.get("timestamp")
                        .and_then(|v| v.as_str())
                        .ok_or_else(|| ActivityError::InvalidInput(
                            format!("Invalid timestamp in input {}", input.id)
                        ))?;

                    DateTime::parse_from_rfc3339(timestamp_str)
                        .map_err(|e| ActivityError::InvalidInput(
                            format!("Invalid timestamp format in {}: {}", input.id, e)
                        ))?;
                }
            }
        }
        Ok(())
    }

    fn check_conditions(&self, context: &ActivityContext) -> ActivityResult<()> {
        // All input data must have valid timestamps for integration
        self.validate_inputs(&context.inputs)
    }

    fn apply_rules(&self, _context: &mut ActivityContext) -> ActivityResult<()> {
        // Time range matching: emotion.beginTime <= relativeTimestamp <= emotion.endTime
        // This is enforced in execute() method
        Ok(())
    }
}

impl Default for TimelineIntegrationActivity {
    fn default() -> Self {
        Self::new()
    }
}

