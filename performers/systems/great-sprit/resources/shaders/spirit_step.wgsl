//! Spirit Step Compute Shader
//! 
//! BPF → Resonance → ODE を1ディスパッチで融合

// State vector (position + velocity)
struct StateVec {
    position: vec3<f32>,
    velocity: vec3<f32>,
}

// Parameters: C, α, β, Δt
struct Params {
    damping: f32,           // C
    neighbor_attraction: f32, // α
    resonance_drive: f32,   // β
    time_step: f32,         // Δt
}

@group(0) @binding(0) var<storage, read_write> S: array<StateVec>;
@group(0) @binding(1) var<storage, read> W: array<vec3<f32>>;
@group(0) @binding(2) var<storage, read> B: array<f32>;  // Bandpass coefficients
@group(0) @binding(3) var<storage, read> G: array<mat3x3<f32>>; // Resonance gains Γ_k
@group(0) @binding(4) var<storage, read> Cj: array<vec3<f32>>; // Well centers c_j
@group(0) @binding(5) var<storage, read> KJ: array<f32>; // Well strengths κ_j
@group(0) @binding(6) var<uniform> P: Params;

const FILTER_LENGTH: u32 = 32u;
const NUM_BANDS: u32 = 8u;
const NUM_WELLS: u32 = 1u;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    if (i >= arrayLength(&S)) {
        return;
    }

    let state = S[i];
    let s = state.position;
    let s_dot = state.velocity;

    // 1) Bandpass filtering: r_k = B_k * W
    // Simplified: use first component of W[i] for each band
    var resonance_sum = vec3<f32>(0.0, 0.0, 0.0);
    
    for (var k: u32 = 0u; k < NUM_BANDS; k++) {
        // Simplified bandpass: just use input directly (actual FIR would need delay line)
        let band_input = W[i].x; // Use x component
        
        // Apply resonance gain: Γ_k · r_k
        let gain_matrix = G[k];
        let band_vec = vec3<f32>(band_input, 0.0, 0.0);
        let contribution = gain_matrix * band_vec;
        resonance_sum += contribution;
    }

    // 2) Potential gradient: -∇U(s) = -Σ_j κ_j (s - c_j)
    var potential_gradient = vec3<f32>(0.0, 0.0, 0.0);
    for (var j: u32 = 0u; j < NUM_WELLS; j++) {
        let diff = s - Cj[j];
        potential_gradient -= KJ[j] * diff;
    }

    // 3) Neighbor centroid (simplified: use zero for now)
    let neighbor_centroid = vec3<f32>(0.0, 0.0, 0.0);

    // 4) Compute acceleration: ẍ = -∇U(s) - C·ṡ + α(ψ̄ - s) + β·R
    let acceleration = -potential_gradient
        - P.damping * s_dot
        + P.neighbor_attraction * (neighbor_centroid - s)
        + P.resonance_drive * resonance_sum;

    // 5) Semi-implicit Verlet update
    // ṡ[t+1] = ṡ[t] + a[t]·Δt
    let new_velocity = s_dot + acceleration * P.time_step;
    
    // s[t+1] = s[t] + ṡ[t+1]·Δt
    let new_position = s + new_velocity * P.time_step;

    // Write back
    S[i] = StateVec(
        position: new_position,
        velocity: new_velocity,
    );
}

