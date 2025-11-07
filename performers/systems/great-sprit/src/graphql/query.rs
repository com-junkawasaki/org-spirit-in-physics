//! GraphQL query resolvers

use async_graphql::*;
use crate::gpu::device::GpuDevice;
use crate::kg::terminus::TerminusClient;
use crate::pipeline::aggregator::Aggregator;

/// Query root
#[derive(Default)]
pub struct Query;

#[Object]
impl Query {
    /// Health check
    async fn health(&self) -> &str {
        "ok"
    }

    /// Get GPU device info
    async fn gpu_info(&self, ctx: &Context<'_>) -> Result<String> {
        let _device = ctx.data::<GpuDevice>()?;
        Ok("GPU device available".to_string())
    }

    /// Get system metrics
    async fn metrics(&self, _ctx: &Context<'_>) -> Result<SystemMetrics> {
        Ok(SystemMetrics {
            num_samples: 0,
            step_time_ms: 0.0,
        })
    }

    /// Get emotion aggregation for a person
    async fn person_emotion_aggregation(
        &self,
        ctx: &Context<'_>,
        person_uri: String,
        start_time: Option<String>,
        end_time: Option<String>,
    ) -> Result<EmotionAggregation> {
        let kg_client = ctx.data::<TerminusClient>()?;
        let aggregator = crate::pipeline::aggregator::Aggregator::new(kg_client.clone());

        let start = start_time
            .as_ref()
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&chrono::Utc));
        let end = end_time
            .as_ref()
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&chrono::Utc));

        let result = aggregator
            .aggregate_person_emotions(&person_uri, start, end)
            .await?;

        Ok(EmotionAggregation {
            average_valence: result.average_valence,
            average_arousal: result.average_arousal,
            average_engagement: result.average_engagement,
            variance_valence: result.variance_valence,
            variance_arousal: result.variance_arousal,
            variance_engagement: result.variance_engagement,
            time_range_start: result.time_range.0.to_rfc3339(),
            time_range_end: result.time_range.1.to_rfc3339(),
            sample_count: result.sample_count,
        })
    }
}

/// System metrics
#[derive(SimpleObject)]
pub struct SystemMetrics {
    pub num_samples: usize,
    pub step_time_ms: f32,
}

/// Emotion aggregation result
#[derive(SimpleObject)]
pub struct EmotionAggregation {
    pub average_valence: f32,
    pub average_arousal: f32,
    pub average_engagement: f32,
    pub variance_valence: f32,
    pub variance_arousal: f32,
    pub variance_engagement: f32,
    pub time_range_start: String,
    pub time_range_end: String,
    pub sample_count: usize,
}

