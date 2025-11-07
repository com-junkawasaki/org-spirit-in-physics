//! Compute pipeline for GPU acceleration

use anyhow::Result;
use wgpu::*;
use crate::gpu::device::GpuDevice;
use crate::gpu::buffers::Buffers;

/// Compute pipeline for spirit step calculation
pub struct ComputePipeline {
    pipeline: wgpu::ComputePipeline,
    bind_group: BindGroup,
    workgroup_size: u32,
}

impl ComputePipeline {
    /// Create compute pipeline
    pub fn new(device: &GpuDevice, buffers: &Buffers, workgroup_size: u32) -> Result<Self> {
        // Load shader
        let shader_source = include_str!("../../resources/shaders/spirit_step.wgsl");
        let shader = device.device.create_shader_module(ShaderModuleDescriptor {
            label: Some("Spirit Step Shader"),
            source: ShaderSource::Wgsl(shader_source.into()),
        });

        // Create bind group layout
        let bind_group_layout = device.device.create_bind_group_layout(&BindGroupLayoutDescriptor {
            label: Some("Spirit Step Bind Group Layout"),
            entries: &[
                // State buffer (S)
                BindGroupLayoutEntry {
                    binding: 0,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::Buffer {
                        ty: BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // Input buffer (W)
                BindGroupLayoutEntry {
                    binding: 1,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::Buffer {
                        ty: BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // Bandpass coefficients (B_k)
                BindGroupLayoutEntry {
                    binding: 2,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::Buffer {
                        ty: BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // Resonance gains (Γ_k)
                BindGroupLayoutEntry {
                    binding: 3,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::Buffer {
                        ty: BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // Well centers (c_j)
                BindGroupLayoutEntry {
                    binding: 4,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::Buffer {
                        ty: BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // Well strengths (κ_j)
                BindGroupLayoutEntry {
                    binding: 5,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::Buffer {
                        ty: BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // Parameters (C, α, β, Δt)
                BindGroupLayoutEntry {
                    binding: 6,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::Buffer {
                        ty: BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });

        // Create bind group
        let bind_group = device.device.create_bind_group(&BindGroupDescriptor {
            label: Some("Spirit Step Bind Group"),
            layout: &bind_group_layout,
            entries: &[
                BindGroupEntry {
                    binding: 0,
                    resource: buffers.state.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 1,
                    resource: buffers.input.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 2,
                    resource: buffers.bandpass_coeffs.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 3,
                    resource: buffers.resonance_gains.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 4,
                    resource: buffers.well_centers.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 5,
                    resource: buffers.well_strengths.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 6,
                    resource: buffers.params.as_entire_binding(),
                },
            ],
        });

        // Create pipeline layout
        let pipeline_layout = device.device.create_pipeline_layout(&PipelineLayoutDescriptor {
            label: Some("Spirit Step Pipeline Layout"),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });

        // Create compute pipeline
        let pipeline = device.device.create_compute_pipeline(&ComputePipelineDescriptor {
            label: Some("Spirit Step Compute Pipeline"),
            layout: Some(&pipeline_layout),
            module: &shader,
            entry_point: Some("main"),
        });

        Ok(Self {
            pipeline,
            bind_group,
            workgroup_size,
        })
    }

    /// Dispatch compute shader
    pub fn dispatch(&self, encoder: &mut CommandEncoder, num_samples: usize) {
        let num_workgroups = (num_samples as u32 + self.workgroup_size - 1) / self.workgroup_size;
        
        let mut compute_pass = encoder.begin_compute_pass(&ComputePassDescriptor {
            label: Some("Spirit Step Compute Pass"),
        });
        
        compute_pass.set_pipeline(&self.pipeline);
        compute_pass.set_bind_group(0, &self.bind_group, &[]);
        compute_pass.dispatch_workgroups(num_workgroups, 1, 1);
    }
}

