//! 式(A): 物理ダイナミクス
//!
//! ẍ = -∇U(s) - C·ṡ + α(ψ̄_𝒩(t) - s) + β·R(t)

use nalgebra::Vector3;

/// 物理ダイナミクスパラメータ
#[derive(Debug, Clone)]
pub struct DynamicsParams {
    /// 減衰係数 C
    pub damping: f32,
    /// 近傍引力係数 α
    pub neighbor_attraction: f32,
    /// 共振駆動係数 β
    pub resonance_drive: f32,
}

impl Default for DynamicsParams {
    fn default() -> Self {
        Self {
            damping: 0.1,
            neighbor_attraction: 0.5,
            resonance_drive: 0.3,
        }
    }
}

/// 加速度計算
pub struct Dynamics;

impl Dynamics {
    /// 式(A)に基づく加速度計算
    ///
    /// # Arguments
    /// * `s` - スピリット位置
    /// * `s_dot` - 速度 ṡ
    /// * `potential_gradient` - ポテンシャル勾配 -∇U(s)
    /// * `neighbor_centroid` - 近傍重心 ψ̄_𝒩(t)
    /// * `resonance` - 共振駆動 R(t)
    /// * `params` - パラメータ
    pub fn compute_acceleration(
        s: &Vector3<f32>,
        s_dot: &Vector3<f32>,
        potential_gradient: &Vector3<f32>,
        neighbor_centroid: &Vector3<f32>,
        resonance: &Vector3<f32>,
        params: &DynamicsParams,
    ) -> Vector3<f32> {
        // ẍ = -∇U(s) - C·ṡ + α(ψ̄_𝒩(t) - s) + β·R(t)
        -potential_gradient
            - params.damping * s_dot
            + params.neighbor_attraction * (neighbor_centroid - s)
            + params.resonance_drive * resonance
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_acceleration() {
        let s = Vector3::new(0.0, 0.0, 0.0);
        let s_dot = Vector3::new(1.0, 0.0, 0.0);
        let potential_gradient = Vector3::new(0.1, 0.0, 0.0);
        let neighbor_centroid = Vector3::new(1.0, 0.0, 0.0);
        let resonance = Vector3::new(0.0, 0.1, 0.0);
        let params = DynamicsParams::default();

        let accel = Dynamics::compute_acceleration(
            &s,
            &s_dot,
            &potential_gradient,
            &neighbor_centroid,
            &resonance,
            &params,
        );

        // 基本的な計算が正しいことを確認
        assert!(accel.norm() > 0.0);
    }
}

