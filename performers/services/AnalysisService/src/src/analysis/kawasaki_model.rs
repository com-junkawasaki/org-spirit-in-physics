//! Kawasaki Model implementation
//! 
//! Merkle DAG: analyzer.analysis.kawasaki_model
//! OWL: spirit:KawasakiModel
//! 
//! Formula: SP = f(Word2Vec, Emotion, ReactionTime)


/// Kawasaki Model for calculating spirit probability
pub struct KawasakiModel;

impl KawasakiModel {
    /// Calculate spirit probability using Kawasaki Model
    /// 
    /// Formula: SP = f(Word2Vec, Emotion, ReactionTime)
    /// 
    /// Components:
    /// - Word2Vec component: Semantic similarity between stimulus and response
    /// - Emotion component: Emotional valence/arousal from Hume AI
    /// - Reaction time component: Normalized reaction time (faster = higher)
    pub fn calculate_spirit_probability(
        word2vec_component: f64,
        emotion_component: f64,
        reaction_time_component: f64,
    ) -> f64 {
        // Weighted combination based on Kawasaki Model
        // TODO: Use actual research formula when available
        let spirit_probability = (
            word2vec_component * 0.4 +
            emotion_component * 0.4 +
            reaction_time_component * 0.2
        ).clamp(0.0, 1.0);

        spirit_probability
    }

    /// Calculate reaction time component
    /// 
    /// Normalizes reaction time to [0, 1] range where:
    /// - Faster reactions (lower ms) = higher component value
    /// - Assumes typical range: 0-5000ms
    pub fn calculate_reaction_time_component(reaction_time_ms: Option<i32>) -> f64 {
        match reaction_time_ms {
            Some(ms) if ms > 0 => {
                // Normalize: faster = higher, assuming max 5000ms
                let normalized = 1.0 - (ms as f64 / 5000.0).min(1.0);
                normalized.max(0.0)
            }
            _ => 0.5, // Default middle value if missing
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_spirit_probability_calculation() {
        let sp = KawasakiModel::calculate_spirit_probability(0.8, 0.7, 0.6);
        assert!(sp >= 0.0 && sp <= 1.0);
        assert_eq!(sp, 0.72); // 0.8*0.4 + 0.7*0.4 + 0.6*0.2
    }

    #[test]
    fn test_reaction_time_component() {
        assert_eq!(KawasakiModel::calculate_reaction_time_component(Some(0)), 1.0);
        assert_eq!(KawasakiModel::calculate_reaction_time_component(Some(2500)), 0.5);
        assert_eq!(KawasakiModel::calculate_reaction_time_component(Some(5000)), 0.0);
        assert_eq!(KawasakiModel::calculate_reaction_time_component(None), 0.5);
    }
}

