//! Face Recognition Module
//!
//! 顔認識・マッチングモジュール。

use anyhow::Result;

/// Face recognition
///
/// 顔認識・マッチングを行う。
pub struct FaceRecognition {
    /// Similarity threshold for matching (0.0 ~ 1.0)
    similarity_threshold: f32,
}

impl FaceRecognition {
    /// Create new face recognition
    pub fn new(similarity_threshold: f32) -> Self {
        Self {
            similarity_threshold: similarity_threshold.clamp(0.0, 1.0),
        }
    }

    /// Match face feature vector against known faces
    ///
    /// 顔特徴ベクトルを既知の顔とマッチングする。
    pub async fn match_face(
        &self,
        feature_vector: &[f32],
        known_faces: &[(String, Vec<f32>)], // (person_uri, feature_vector)
    ) -> Result<Option<String>> {
        // Calculate cosine similarity with each known face
        let mut best_match: Option<(String, f32)> = None;

        for (person_uri, known_features) in known_faces {
            let similarity = self.cosine_similarity(feature_vector, known_features);
            
            if similarity >= self.similarity_threshold {
                if let Some((_, best_sim)) = &best_match {
                    if similarity > *best_sim {
                        best_match = Some((person_uri.clone(), similarity));
                    }
                } else {
                    best_match = Some((person_uri.clone(), similarity));
                }
            }
        }

        Ok(best_match.map(|(uri, _)| uri))
    }

    /// Calculate cosine similarity between two feature vectors
    ///
    /// 2つの特徴ベクトル間のコサイン類似度を計算する。
    fn cosine_similarity(&self, vec1: &[f32], vec2: &[f32]) -> f32 {
        if vec1.len() != vec2.len() {
            return 0.0;
        }

        let dot_product: f32 = vec1.iter().zip(vec2.iter()).map(|(a, b)| a * b).sum();
        let norm1: f32 = vec1.iter().map(|x| x * x).sum::<f32>().sqrt();
        let norm2: f32 = vec2.iter().map(|x| x * x).sum::<f32>().sqrt();

        if norm1 == 0.0 || norm2 == 0.0 {
            return 0.0;
        }

        dot_product / (norm1 * norm2)
    }
}

impl Default for FaceRecognition {
    fn default() -> Self {
        Self::new(0.7) // Default: 70% similarity threshold
    }
}

