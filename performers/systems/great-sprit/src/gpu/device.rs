//! GPU device initialization

use anyhow::Result;
use wgpu::*;
use tracing::{info, warn, error};

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
        info!("Initializing GPU device...");
        eprintln!("[GPU] Creating wgpu instance...");
        
        // Create instance
        let instance = Instance::new(InstanceDescriptor {
            backends: Backends::all(),
            ..Default::default()
        });

        info!("Requesting GPU adapter (trying high performance first)...");
        eprintln!("[GPU] Requesting adapter: HighPerformance");
        
        // Request adapter
        // Try high performance first, then fallback to low power, then force fallback
        let adapter = if let Some(adapter) = instance
            .request_adapter(&RequestAdapterOptions {
                power_preference: PowerPreference::HighPerformance,
                compatible_surface: None,
                force_fallback_adapter: false,
            })
            .await
        {
            info!("GPU adapter found: HighPerformance");
            eprintln!("[GPU] Adapter found: HighPerformance");
            adapter
        } else {
            warn!("HighPerformance adapter not found, trying LowPower...");
            eprintln!("[GPU] HighPerformance adapter not found, trying LowPower...");
            
            if let Some(adapter) = instance
                .request_adapter(&RequestAdapterOptions {
                    power_preference: PowerPreference::LowPower,
                    compatible_surface: None,
                    force_fallback_adapter: false,
                })
                .await
            {
                info!("GPU adapter found: LowPower");
                eprintln!("[GPU] Adapter found: LowPower");
                adapter
            } else {
                warn!("LowPower adapter not found, trying fallback adapter...");
                eprintln!("[GPU] LowPower adapter not found, trying fallback adapter...");
                
                if let Some(adapter) = instance
                    .request_adapter(&RequestAdapterOptions {
                        power_preference: PowerPreference::HighPerformance,
                        compatible_surface: None,
                        force_fallback_adapter: true,
                    })
                    .await
                {
                    warn!("GPU adapter found: Fallback (CPU-based)");
                    eprintln!("[GPU] Adapter found: Fallback (CPU-based)");
                    adapter
                } else {
                    error!("Failed to find any GPU adapter");
                    eprintln!("[GPU] ERROR: Failed to find any GPU adapter");
                    anyhow::bail!("Failed to find suitable GPU adapter (including fallback)");
                }
            }
        };

        // Request device
        info!("Requesting GPU device...");
        eprintln!("[GPU] Requesting device...");
        
        let (device, queue) = adapter
            .request_device(
                &DeviceDescriptor {
                    label: Some("Great Spirit GPU Device"),
                    required_features: Features::empty(),
                    required_limits: Limits::default(),
                },
                None,
            )
            .await
            .map_err(|e| {
                error!("Failed to request GPU device: {:?}", e);
                eprintln!("[GPU] ERROR: Failed to request device: {:?}", e);
                e
            })?;

        info!("GPU device initialized successfully");
        eprintln!("[GPU] Device initialized successfully");
        
        Ok(Self {
            instance,
            adapter,
            device,
            queue,
        })
    }

    /// Get device limits
    pub fn limits(&self) -> Limits {
        self.adapter.limits()
    }
}

