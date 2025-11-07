//! GPU kernel execution

use anyhow::Result;
use wgpu::*;
use crate::gpu::device::GpuDevice;
use crate::gpu::buffers::Buffers;
use crate::gpu::compute_pipeline::ComputePipeline;
use crate::config::Config;

/// GPU kernel executor
pub struct Kernel {
    device: GpuDevice,
    buffers: Buffers,
    pipeline: ComputePipeline,
    num_samples: usize,
}

impl Kernel {
    /// Create kernel
    pub async fn new(config: &Config) -> Result<Self> {
        let device = GpuDevice::init().await?;
        let num_samples = config.total_samples();
        let buffers = Buffers::new(
            &device.device,
            num_samples,
            config.num_bands,
            1, // Default: 1 potential well
        )?;
        let pipeline = ComputePipeline::new(&device.device, &buffers, config.workgroup_size)?;

        Ok(Self {
            device,
            buffers,
            pipeline,
            num_samples,
        })
    }

    /// Execute one step
    pub fn step(&mut self) -> Result<()> {
        let mut encoder = self.device.device.create_command_encoder(&CommandEncoderDescriptor {
            label: Some("Spirit Step Encoder"),
        });

        self.pipeline.dispatch(&mut encoder, self.num_samples);

        self.device.queue.submit(std::iter::once(encoder.finish()));

        Ok(())
    }

    /// Get device reference
    pub fn device(&self) -> &GpuDevice {
        &self.device
    }

    /// Get buffers reference
    pub fn buffers(&self) -> &Buffers {
        &self.buffers
    }
}

