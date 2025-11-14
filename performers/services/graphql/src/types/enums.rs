// Merkle DAG: graphql.service.types.enums
// ENUM型の定義（sqlxでENUM型をRust enum型にマッピング）

use sqlx::Type;
use serde::{Deserialize, Serialize};

/// Emotion file type enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Type, Serialize, Deserialize)]
#[sqlx(type_name = "emotion_file_type", rename_all = "lowercase")]
pub enum EmotionFileType {
    Burst,
    Face,
    Language,
    Prosody,
}

/// Handedness type enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Type, Serialize, Deserialize)]
#[sqlx(type_name = "handedness_type", rename_all = "lowercase")]
pub enum HandednessType {
    Left,
    Right,
    Ambidextrous,
    Unknown,
}

impl HandednessType {
    /// Convert to lowercase string for GraphQL
    pub fn to_string(&self) -> String {
        match self {
            HandednessType::Left => "left".to_string(),
            HandednessType::Right => "right".to_string(),
            HandednessType::Ambidextrous => "ambidextrous".to_string(),
            HandednessType::Unknown => "unknown".to_string(),
        }
    }
}

impl EmotionFileType {
    /// Convert to lowercase string for GraphQL
    pub fn to_string(&self) -> String {
        match self {
            EmotionFileType::Burst => "burst".to_string(),
            EmotionFileType::Face => "face".to_string(),
            EmotionFileType::Language => "language".to_string(),
            EmotionFileType::Prosody => "prosody".to_string(),
        }
    }
}

