//! GPU buffer management
//!
//! f16対応、リングバッファ、メモリ帯域最適化を含む

use anyhow::Result;
use wgpu::*;
use bytemuck::{Pod, Zeroable};
use nalgebra::Vector3;

/// State vector (position + velocity)
#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct StateVec {
    pub position: [f32; 3],
    pub velocity: [f32; 3],
}

// Helper functions to convert between Vector3 and [f32; 3]
// Note: Cannot implement From trait due to orphan rule
pub fn vector3_to_array(v: Vector3<f32>) -> [f32; 3] {
    [v.x, v.y, v.z]
}

pub fn array_to_vector3(arr: [f32; 3]) -> Vector3<f32> {
    Vector3::new(arr[0], arr[1], arr[2])
}

/// GPU buffers
pub struct Buffers {
    /// State buffer (S): positions and velocities
    pub state: Buffer,
    /// Input buffer (W): world information input (ring buffer)
    pub input: Buffer,
    /// Bandpass filter coefficients (B_k)
    pub bandpass_coeffs: Buffer,
    /// Resonance gain matrices (Γ_k)
    pub resonance_gains: Buffer,
    /// Potential well centers (c_j)
    pub well_centers: Buffer,
    /// Potential well strengths (κ_j)
    pub well_strengths: Buffer,
    /// Parameters (C, α, β, Δt)
    pub params: Buffer,
}

impl Buffers {
    /// Create buffers for N×P samples
    pub fn new(device: &Device, num_samples: usize, num_bands: usize, num_wells: usize) -> Result<Self> {
        // State buffer: 2 × num_samples (position + velocity)
        let state_size = (std::mem::size_of::<StateVec>() * num_samples) as u64;
        let state = device.create_buffer(&BufferDescriptor {
            label: Some("State Buffer"),
            size: state_size,
            usage: BufferUsages::STORAGE | BufferUsages::COPY_DST | BufferUsages::COPY_SRC,
            mapped_at_creation: false,
        });

        // Input ring buffer: num_samples × input_dim
        let input_size = (std::mem::size_of::<f32>() * num_samples * 3) as u64; // 3D input
        let input = device.create_buffer(&BufferDescriptor {
            label: Some("Input Buffer"),
            size: input_size,
            usage: BufferUsages::STORAGE | BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        // Bandpass filter coefficients: num_bands × filter_length
        let filter_length = 32; // Default filter length
        let bandpass_size = (std::mem::size_of::<f32>() * num_bands * filter_length) as u64;
        let bandpass_coeffs = device.create_buffer(&BufferDescriptor {
            label: Some("Bandpass Coefficients"),
            size: bandpass_size,
            usage: BufferUsages::STORAGE | BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        // Resonance gain matrices: num_bands × 3×3 matrices
        let resonance_size = (std::mem::size_of::<f32>() * num_bands * 9) as u64; // 3x3 = 9 floats
        let resonance_gains = device.create_buffer(&BufferDescriptor {
            label: Some("Resonance Gains"),
            size: resonance_size,
            usage: BufferUsages::STORAGE | BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        // Potential well centers: num_wells × 3D
        let well_centers_size = (std::mem::size_of::<f32>() * num_wells * 3) as u64;
        let well_centers = device.create_buffer(&BufferDescriptor {
            label: Some("Well Centers"),
            size: well_centers_size,
            usage: BufferUsages::STORAGE | BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        // Potential well strengths: num_wells
        let well_strengths_size = (std::mem::size_of::<f32>() * num_wells) as u64;
        let well_strengths = device.create_buffer(&BufferDescriptor {
            label: Some("Well Strengths"),
            size: well_strengths_size,
            usage: BufferUsages::STORAGE | BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        // Parameters: C, α, β, Δt (4 floats)
        let params_size = (std::mem::size_of::<f32>() * 4) as u64;
        let params = device.create_buffer(&BufferDescriptor {
            label: Some("Parameters"),
            size: params_size,
            usage: BufferUsages::UNIFORM | BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        Ok(Self {
            state,
            input,
            bandpass_coeffs,
            resonance_gains,
            well_centers,
            well_strengths,
            params,
        })
    }
}

