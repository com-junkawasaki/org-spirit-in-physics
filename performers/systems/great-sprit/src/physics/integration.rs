//! 式(D): セミインプリシットVerlet積分
//!
//! a[t] = -∇U(s[t]) - C·ṡ[t] + α(ψ̄[t] - s[t]) + β·R[t]
//! ṡ[t+1] = ṡ[t] + a[t]·Δt
//! s[t+1] = s[t] + ṡ[t+1]·Δt

use nalgebra::Vector3;
use crate::physics::dynamics::{Dynamics, DynamicsParams};
use crate::physics::potential::Potential;
use crate::physics::resonance::Resonance;

/// 状態ベクトル
#[derive(Debug, Clone)]
pub struct State {
    /// 位置 s
    pub position: Vector3<f32>,
    /// 速度 ṡ
    pub velocity: Vector3<f32>,
}

impl State {
    pub fn new(position: Vector3<f32>, velocity: Vector3<f32>) -> Self {
        Self { position, velocity }
    }

    pub fn zeros() -> Self {
        Self {
            position: Vector3::zeros(),
            velocity: Vector3::zeros(),
        }
    }
}

/// セミインプリシットVerlet積分器
pub struct Integration {
    /// 時間ステップ Δt
    dt: f32,
    /// ダイナミクスパラメータ
    dynamics_params: DynamicsParams,
}

impl Integration {
    pub fn new(dt: f32, dynamics_params: DynamicsParams) -> Self {
        Self {
            dt,
            dynamics_params,
        }
    }

    /// 1ステップ積分
    ///
    /// # Arguments
    /// * `state` - 現在の状態
    /// * `potential` - ポテンシャル
    /// * `neighbor_centroid` - 近傍重心 ψ̄_𝒩(t)
    /// * `resonance` - 共振駆動 R(t)
    pub fn step(
        &self,
        state: &mut State,
        potential: &Potential,
        neighbor_centroid: &Vector3<f32>,
        resonance: &Vector3<f32>,
    ) {
        // ポテンシャル勾配を計算
        let potential_gradient = potential.gradient(&state.position);

        // 加速度を計算: 式(A)
        let acceleration = Dynamics::compute_acceleration(
            &state.position,
            &state.velocity,
            &potential_gradient,
            neighbor_centroid,
            resonance,
            &self.dynamics_params,
        );

        // セミインプリシットVerlet更新: 式(D)
        // ṡ[t+1] = ṡ[t] + a[t]·Δt
        state.velocity += acceleration * self.dt;

        // s[t+1] = s[t] + ṡ[t+1]·Δt
        state.position += state.velocity * self.dt;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::physics::potential::PotentialWell;

    #[test]
    fn test_integration_step() {
        let dt = 0.01;
        let params = DynamicsParams::default();
        let integrator = Integration::new(dt, params);

        let mut state = State::zeros();
        state.position = Vector3::new(1.0, 0.0, 0.0);

        let potential = Potential::new(vec![PotentialWell {
            center: Vector3::zeros(),
            strength: 1.0,
        }]);

        let neighbor_centroid = Vector3::zeros();
        let resonance = Vector3::zeros();

        let initial_pos = state.position;
        integrator.step(&mut state, &potential, &neighbor_centroid, &resonance);

        // 位置が更新されていることを確認
        assert_ne!(state.position, initial_pos);
    }
}

