//! GraphQL query resolvers

use async_graphql::*;
use crate::gpu::device::GpuDevice;
use crate::kg::terminus::TerminusClient;

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
}

/// System metrics
#[derive(SimpleObject)]
pub struct SystemMetrics {
    pub num_samples: usize,
    pub step_time_ms: f32,
}

