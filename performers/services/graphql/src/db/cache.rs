// Merkle DAG: database.cache_utils
// Force3Dグラフキャッシュのユーティリティ関数
// RDF: https://spirit-in-physics.gftd.ai/db/cache

use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};

// Force3DGraphParamsの簡易版（activities/mod.rsから参照）
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Force3DGraphParamsInput {
    pub selected_emotions: Option<Vec<String>>,
    pub selected_modalities: Option<Vec<String>>,
    pub physics_mode: Option<String>,
    pub segment: Option<String>,
    pub top_k: Option<i32>,
    pub min_w: Option<f64>,
    pub weight_gamma: Option<f64>,
    pub shell_radius: Option<f64>,
    pub rest_length: Option<f64>,
    pub spring_k: Option<f64>,
    pub selected_word: Option<String>,
}

impl From<&Force3DGraphParamsInput> for CacheableParams {
    fn from(params: &Force3DGraphParamsInput) -> Self {
        CacheableParams {
            selected_emotions: params.selected_emotions.clone(),
            selected_modalities: params.selected_modalities.clone(),
            physics_mode: params.physics_mode.clone(),
            segment: params.segment.clone(),
            top_k: params.top_k,
            min_w: params.min_w,
            weight_gamma: params.weight_gamma,
            shell_radius: params.shell_radius,
            rest_length: params.rest_length,
            spring_k: params.spring_k,
            selected_word: params.selected_word.clone(),
        }
    }
}

/// Force3DGraphParamsのハッシュ化可能な表現
/// 注意: f64フィールドがあるためHashを実装できない。代わりにcompute_hash()メソッドを使用
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct CacheableParams {
    pub selected_emotions: Option<Vec<String>>,
    pub selected_modalities: Option<Vec<String>>,
    pub physics_mode: Option<String>,
    pub segment: Option<String>,
    pub top_k: Option<i32>,
    pub min_w: Option<f64>,
    pub weight_gamma: Option<f64>,
    pub shell_radius: Option<f64>,
    pub rest_length: Option<f64>,
    pub spring_k: Option<f64>,
    pub selected_word: Option<String>,
}

impl CacheableParams {
    /// パラメータを正規化してハッシュキーを生成
    /// ソートや正規化を行い、同じパラメータが同じハッシュになるようにする
    pub fn normalize(&mut self) {
        // ベクトルをソートして順序を統一
        if let Some(ref mut emotions) = self.selected_emotions {
            emotions.sort();
        }
        if let Some(ref mut modalities) = self.selected_modalities {
            modalities.sort();
        }
    }

    /// SHA256ハッシュを計算して返す
    pub fn compute_hash(&self) -> String {
        let mut normalized = self.clone();
        normalized.normalize();
        
        // JSONシリアライズしてハッシュ計算
        let json = serde_json::to_string(&normalized)
            .expect("Failed to serialize params for hashing");
        
        let mut hasher = Sha256::new();
        hasher.update(json.as_bytes());
        let hash = hasher.finalize();
        
        // 16進数文字列に変換
        format!("{:x}", hash)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_consistency() {
        let mut params1 = CacheableParams {
            selected_emotions: Some(vec!["joy".to_string(), "sadness".to_string()]),
            selected_modalities: Some(vec!["prosody".to_string()]),
            physics_mode: Some("emotion".to_string()),
            segment: Some("all".to_string()),
            top_k: Some(2),
            min_w: Some(0.25),
            weight_gamma: Some(1.6),
            shell_radius: Some(300.0),
            rest_length: Some(80.0),
            spring_k: Some(2.0),
            selected_word: None,
        };

        // 順序が異なるが同じ内容
        let mut params2 = CacheableParams {
            selected_emotions: Some(vec!["sadness".to_string(), "joy".to_string()]),
            selected_modalities: Some(vec!["prosody".to_string()]),
            physics_mode: Some("emotion".to_string()),
            segment: Some("all".to_string()),
            top_k: Some(2),
            min_w: Some(0.25),
            weight_gamma: Some(1.6),
            shell_radius: Some(300.0),
            rest_length: Some(80.0),
            spring_k: Some(2.0),
            selected_word: None,
        };

        let hash1 = params1.compute_hash();
        let hash2 = params2.compute_hash();
        
        assert_eq!(hash1, hash2, "Hash should be consistent regardless of order");
    }
}

