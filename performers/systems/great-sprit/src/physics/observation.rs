//! 式(E): 観測同化
//!
//! Θ ← argmin_Θ [λ_traj|ẍ - rhs(A)|² + λ_emo L_emo(a_t, s_t)]

use nalgebra::Vector3;
use crate::physics::dynamics::DynamicsParams;

/// 観測データ
#[derive(Debug, Clone)]
pub struct Observation {
    /// 観測された情動ベクトル a_t
    pub emotion_vector: Vector3<f32>,
    /// タイムスタンプ
    pub timestamp: f64,
}

/// 観測同化器
pub struct ObservationAssimilation {
    /// 軌跡損失の重み λ_traj
    pub trajectory_weight: f32,
    /// 情動損失の重み λ_emo
    pub emotion_weight: f32,
}

impl ObservationAssimilation {
    pub fn new(trajectory_weight: f32, emotion_weight: f32) -> Self {
        Self {
            trajectory_weight,
            emotion_weight,
        }
    }

    /// 軌跡損失: |ẍ - rhs(A)|²
    pub fn trajectory_loss(
        &self,
        acceleration: &Vector3<f32>,
        computed_acceleration: &Vector3<f32>,
    ) -> f32 {
        let diff = acceleration - computed_acceleration;
        self.trajectory_weight * diff.norm_squared()
    }

    /// 情動損失: L_emo(a_t, s_t)
    ///
    /// 観測された情動ベクトルとスピリット位置の投影の不一致を測定
    pub fn emotion_loss(
        &self,
        observed_emotion: &Vector3<f32>,
        spirit_position: &Vector3<f32>,
    ) -> f32 {
        // 簡略化：位置を情動空間に投影したものとの差
        // 実際の実装では、より複雑なマッピングが必要
        let diff = observed_emotion - spirit_position;
        self.emotion_weight * diff.norm_squared()
    }

    /// 総損失
    pub fn total_loss(
        &self,
        acceleration: &Vector3<f32>,
        computed_acceleration: &Vector3<f32>,
        observed_emotion: &Vector3<f32>,
        spirit_position: &Vector3<f32>,
    ) -> f32 {
        self.trajectory_loss(acceleration, computed_acceleration)
            + self.emotion_loss(observed_emotion, spirit_position)
    }

    /// パラメータ更新（簡略化：勾配降下の1ステップ）
    ///
    /// 実際の実装では、より高度な最適化手法（Adam、L-BFGS等）を使用
    pub fn update_params(
        &self,
        _params: &mut DynamicsParams,
        _loss: f32,
    ) {
        // TODO: パラメータ更新の実装
        // 実際の実装では、自動微分や数値微分を使用して勾配を計算
    }
}

impl Default for ObservationAssimilation {
    fn default() -> Self {
        Self {
            trajectory_weight: 1.0,
            emotion_weight: 0.5,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_trajectory_loss() {
        let assim = ObservationAssimilation::default();
        let accel1 = Vector3::new(1.0, 0.0, 0.0);
        let accel2 = Vector3::new(0.9, 0.0, 0.0);
        let loss = assim.trajectory_loss(&accel1, &accel2);
        assert!(loss > 0.0);
    }

    #[test]
    fn test_emotion_loss() {
        let assim = ObservationAssimilation::default();
        let emotion = Vector3::new(1.0, 0.0, 0.0);
        let position = Vector3::new(0.9, 0.0, 0.0);
        let loss = assim.emotion_loss(&emotion, &position);
        assert!(loss > 0.0);
    }
}

