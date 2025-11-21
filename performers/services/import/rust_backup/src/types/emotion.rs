// Merkle DAG: import.service.types.emotion
// Emotion data types

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BurstEmotionRecord {
    pub id: String,
    pub begin_time: Option<f64>,
    pub end_time: Option<f64>,
    pub emotion_scores: HashMap<String, f64>,
    pub vocal_types: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FaceEmotionRecord {
    pub id: String,
    pub frame: Option<i32>,
    pub time: Option<f64>,
    pub probability: Option<f64>,
    pub face_x0: Option<f64>,
    pub face_y0: Option<f64>,
    pub face_width: Option<f64>,
    pub face_height: Option<f64>,
    pub emotion_scores: HashMap<String, f64>,
    pub au_scores: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageEmotionRecord {
    pub id: String,
    pub text: Option<String>,
    pub begin_time: Option<f64>,
    pub end_time: Option<f64>,
    pub emotion_scores: HashMap<String, f64>,
    pub toxicity_scores: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProsodyEmotionRecord {
    pub id: String,
    pub time: Option<f64>,
    pub emotion_scores: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmotionEntry {
    pub participant_id: String,
    pub text: Option<String>,
    pub begin_time: Option<f64>,
    pub end_time: Option<f64>,
    pub confidence: f64,
    pub emotions: Vec<EmotionScore>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmotionScore {
    pub name: String,
    pub score: f64,
}

