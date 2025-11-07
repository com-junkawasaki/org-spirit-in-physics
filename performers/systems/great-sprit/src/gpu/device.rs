//! GPU device initialization

use anyhow::Result;
use wgpu::*;

/// GPU device wrapper
pub struct GpuDevice {
    pub instance: Instance,
    pub adapter: Adapter,
    pub device: Device,
    pub queue: Queue,
}

impl GpuDevice {
    /// Initialize GPU device
    pub async fn init() -> Result<Self> {
        // Create instance
        let instance = Instance::new(InstanceDescriptor {
            backends: Backends::all(),
            ..Default::default()
        });

        // Request adapter
        let adapter = instance
            .request_adapter(&RequestAdapterOptions {
                power_preference: PowerPreference::HighPerformance,
                compatible_surface: None,
                force_fallback_adapter: false,
            })
            .await
            .ok_or_else(|| anyhow::anyhow!("Failed to find suitable GPU adapter"))?;

        // Request device
        let (device, queue) = adapter
            .request_device(
                &DeviceDescriptor {
                    label: Some("Great Spirit GPU Device"),
                    features: Features::empty(),
                    limits: Limits::default(),
                },
                None,
            )
            .await?;

        Ok(Self {
            instance,
            adapter,
            device,
            queue,
        })
    }

    /// Get device limits
    pub fn limits(&self) -> &Limits {
        &self.adapter.limits()
    }
}

