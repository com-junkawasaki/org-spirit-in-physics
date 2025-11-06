//! Spirit probability calculation orchestration
//! 
//! Merkle DAG: analyzer.analysis.spirit_probability
//! OWL: spirit:SpiritProbability

use crate::models::{WordResponse, AnalysisResult};
use crate::analysis::{KawasakiModel, Word2VecCalculator, EmotionCalculator};

/// Calculate spirit probability for a word response
pub fn calculate_spirit_probability(response: &WordResponse) -> AnalysisResult {
    // Calculate components
    let word2vec_component = Word2VecCalculator::calculate_component(response);
    let emotion_component = EmotionCalculator::calculate_component(response);
    let reaction_time_component = KawasakiModel::calculate_reaction_time_component(response.reaction_time_ms);

    // Calculate spirit probability using Kawasaki Model
    let spirit_probability = KawasakiModel::calculate_spirit_probability(
        word2vec_component,
        emotion_component,
        reaction_time_component,
    );

    AnalysisResult {
        id: None,
        participant_id: response.participant_id.clone(),
        experiment_id: response.experiment_id.clone(),
        word_stimulus_id: response.word_stimulus_id,
        stimulus_word: response.stimulus_word.clone(),
        response_word: response.response_word.clone(),
        reaction_time_ms: response.reaction_time_ms,
        spirit_probability,
        word2vec_component: Some(word2vec_component),
        reaction_time_component: Some(reaction_time_component),
        skin_potential_component: response.skin_potential.map(|v| v as f64),
        emotion_component: Some(emotion_component),
        emotion_data: None, // TODO: Include actual emotion data
        physiological_data: None, // TODO: Include physiological data
        created_at: None,
        updated_at: None,
    }
}

