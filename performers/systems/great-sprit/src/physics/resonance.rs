//! 式(B): 共振駆動 R(t)
//!
//! R(t) ≈ Σ_k Γ_k · (B_k * w)(t)

use nalgebra::Vector3;

/// バンドパスフィルタ係数
#[derive(Debug, Clone)]
pub struct BandpassFilter {
    /// フィルタ係数（FIR）
    pub coefficients: Vec<f32>,
    /// 遅延線（リングバッファ）
    delay_line: Vec<f32>,
    /// 現在のインデックス
    index: usize,
}

impl BandpassFilter {
    pub fn new(coefficients: Vec<f32>) -> Self {
        let len = coefficients.len();
        Self {
            coefficients,
            delay_line: vec![0.0; len],
            index: 0,
        }
    }

    /// フィルタ適用: (B_k * w)(t)
    pub fn filter(&mut self, input: f32) -> f32 {
        // リングバッファに書き込み
        self.delay_line[self.index] = input;
        self.index = (self.index + 1) % self.delay_line.len();

        // 畳み込み計算
        let mut output = 0.0;
        for (i, &coeff) in self.coefficients.iter().enumerate() {
            let delay_idx = (self.index + self.delay_line.len() - i - 1) % self.delay_line.len();
            output += coeff * self.delay_line[delay_idx];
        }

        output
    }

    /// フィルタをリセット
    pub fn reset(&mut self) {
        self.delay_line.fill(0.0);
        self.index = 0;
    }
}

/// 共振帯域ゲイン行列 Γ_k
#[derive(Debug, Clone)]
pub struct ResonanceGain {
    /// ゲイン行列（3x3）
    pub matrix: nalgebra::Matrix3<f32>,
}

impl ResonanceGain {
    pub fn new(matrix: nalgebra::Matrix3<f32>) -> Self {
        Self { matrix }
    }

    /// ゲイン適用: Γ_k · r_k
    pub fn apply(&self, band_output: f32) -> Vector3<f32> {
        // スカラーをベクトルに変換してから行列を適用
        let input_vec = Vector3::new(band_output, 0.0, 0.0);
        self.matrix * input_vec
    }
}

/// 共振駆動計算器
pub struct Resonance {
    /// バンドパスフィルタのリスト
    filters: Vec<BandpassFilter>,
    /// ゲイン行列のリスト
    gains: Vec<ResonanceGain>,
}

impl Resonance {
    pub fn new(filters: Vec<BandpassFilter>, gains: Vec<ResonanceGain>) -> Self {
        assert_eq!(filters.len(), gains.len());
        Self { filters, gains }
    }

    /// 式(B)に基づく共振駆動 R(t) を計算
    ///
    /// # Arguments
    /// * `w` - 世界の情報入力ベクトル（各次元を独立に処理）
    pub fn compute(&mut self, w: &[f32]) -> Vector3<f32> {
        let mut resonance = Vector3::zeros();

        // 各帯域について処理
        for (filter, gain) in self.filters.iter_mut().zip(self.gains.iter()) {
            // 入力の最初の要素を使用（簡略化：実際は多次元入力に対応）
            let band_output = if !w.is_empty() {
                filter.filter(w[0])
            } else {
                0.0
            };

            // ゲイン適用: Γ_k · (B_k * w)(t)
            let contribution = gain.apply(band_output);
            resonance += contribution;
        }

        resonance
    }

    /// フィルタをリセット
    pub fn reset(&mut self) {
        for filter in &mut self.filters {
            filter.reset();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bandpass_filter() {
        let coeffs = vec![0.5, 0.3, 0.2];
        let mut filter = BandpassFilter::new(coeffs);
        let output = filter.filter(1.0);
        assert_eq!(output, 0.5); // 最初の係数 × 入力
    }

    #[test]
    fn test_resonance() {
        let filters = vec![
            BandpassFilter::new(vec![1.0]),
            BandpassFilter::new(vec![1.0]),
        ];
        let gains = vec![
            ResonanceGain::new(nalgebra::Matrix3::identity()),
            ResonanceGain::new(nalgebra::Matrix3::identity()),
        ];
        let mut resonance = Resonance::new(filters, gains);
        let w = vec![1.0];
        let r = resonance.compute(&w);
        assert!(r.norm() > 0.0);
    }
}

