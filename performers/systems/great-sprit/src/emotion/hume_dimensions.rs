//! Hume AI Equivalent Emotion Dimensions
//!
//! Hume AI相当の感情次元定義。
//! valence, arousal, engagement等の次元を含む。

use serde::{Deserialize, Serialize};

/// Emotion dimensions matching Hume AI EVI API
///
/// Hume AIの感情次元に相当する構造体。
/// 複数の感情次元を同時に表現する。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmotionDimensions {
    /// Valence: 感情価（-1.0: ネガティブ 〜 1.0: ポジティブ）
    pub valence: f32,
    
    /// Arousal: 覚醒度（0.0: 低 〜 1.0: 高）
    pub arousal: f32,
    
    /// Engagement: 関与度（0.0: 低 〜 1.0: 高）
    pub engagement: f32,
    
    /// Additional dimensions (optional)
    /// 追加の感情次元（オプション）
    #[serde(flatten)]
    pub additional: std::collections::HashMap<String, f32>,
}

impl EmotionDimensions {
    /// Create new emotion dimensions
    pub fn new(valence: f32, arousal: f32, engagement: f32) -> Self {
        Self {
            valence: valence.clamp(-1.0, 1.0),
            arousal: arousal.clamp(0.0, 1.0),
            engagement: engagement.clamp(0.0, 1.0),
            additional: std::collections::HashMap::new(),
        }
    }

    /// Add additional dimension
    pub fn add_dimension(&mut self, name: String, value: f32) {
        self.additional.insert(name, value.clamp(0.0, 1.0));
    }

    /// Convert to JSON string for RDF storage
    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| "{}".to_string())
    }

    /// Create from JSON string
    pub fn from_json(json: &str) -> anyhow::Result<Self> {
        serde_json::from_str(json).map_err(|e| anyhow::anyhow!("Failed to parse emotion dimensions: {}", e))
    }
}

impl Default for EmotionDimensions {
    fn default() -> Self {
        Self::new(0.0, 0.5, 0.5)
    }
}

