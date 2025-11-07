//! 内的ポテンシャル U(s)
//!
//! U(s) = Σ_j (κ_j/2) |s - c_j|²

use nalgebra::Vector3;

/// ポテンシャル井戸（複合体）
#[derive(Debug, Clone)]
pub struct PotentialWell {
    /// 中心位置 c_j
    pub center: Vector3<f32>,
    /// 強度 κ_j
    pub strength: f32,
}

/// 内的ポテンシャル
pub struct Potential {
    /// ポテンシャル井戸のリスト
    wells: Vec<PotentialWell>,
}

impl Potential {
    pub fn new(wells: Vec<PotentialWell>) -> Self {
        Self { wells }
    }

    /// ポテンシャル値 U(s) を計算
    pub fn value(&self, s: &Vector3<f32>) -> f32 {
        self.wells
            .iter()
            .map(|well| {
                let diff = s - well.center;
                0.5 * well.strength * diff.norm_squared()
            })
            .sum()
    }

    /// ポテンシャル勾配 -∇U(s) を計算
    pub fn gradient(&self, s: &Vector3<f32>) -> Vector3<f32> {
        self.wells
            .iter()
            .map(|well| {
                let diff = s - well.center;
                -well.strength * diff
            })
            .sum()
    }

    /// 井戸を追加
    pub fn add_well(&mut self, well: PotentialWell) {
        self.wells.push(well);
    }

    /// 井戸の数を取得
    pub fn num_wells(&self) -> usize {
        self.wells.len()
    }
}

impl Default for Potential {
    fn default() -> Self {
        Self {
            wells: vec![
                PotentialWell {
                    center: Vector3::new(0.0, 0.0, 0.0),
                    strength: 1.0,
                },
            ],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_potential_value() {
        let potential = Potential::default();
        let s = Vector3::new(1.0, 0.0, 0.0);
        let value = potential.value(&s);
        assert!(value > 0.0);
    }

    #[test]
    fn test_potential_gradient() {
        let potential = Potential::default();
        let s = Vector3::new(1.0, 0.0, 0.0);
        let gradient = potential.gradient(&s);
        // 中心から離れる方向に負の勾配（引力）
        assert!(gradient.norm() > 0.0);
    }
}

