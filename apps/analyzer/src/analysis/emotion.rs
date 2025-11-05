//! Emotion component calculation
//! 
//! Merkle DAG: analyzer.analysis.emotion
//! OWL: spirit:EmotionComponent

use crate::models::WordResponse;

/// Emotion component calculator
pub struct EmotionCalculator;

impl EmotionCalculator {
    /// Calculate emotion component from response data
    /// 
    /// Uses emotion confidence if available, otherwise defaults
    pub fn calculate_component(response: &WordResponse) -> f64 {
        // Use emotion_confidence if available
        if let Some(confidence) = response.emotion_confidence {
            return confidence.clamp(0.0, 1.0);
        }

        // If emotion string is present but no confidence, use default
        if response.emotion.is_some() {
            return 0.5; // Default middle value
        }

        // No emotion data available
        0.3 // Lower default when no emotion data
    }
}

