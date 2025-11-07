//! 近傍重心計算 ψ̄_𝒩(t)
//!
//! ψ̄_𝒩(t) = Σ_v k_{u*}(v) · ψ(v) / Σ_v k_{u*}(v)

use anyhow::Result;
use nalgebra::DVector;
use crate::kg::embedding::Embedding;
use crate::kg::distance::GraphDistance;

/// Centroid calculator
pub struct Centroid {
    embedding: Embedding,
    distance: GraphDistance,
    center_vertex: String,
}

impl Centroid {
    pub fn new(embedding: Embedding, distance: GraphDistance, center_vertex: String) -> Self {
        Self {
            embedding,
            distance,
            center_vertex,
        }
    }

    /// Compute neighbor centroid ψ̄_𝒩(t)
    ///
    /// # Arguments
    /// * `neighbors` - List of neighbor vertex IDs
    pub async fn compute(&self, neighbors: &[String]) -> Result<DVector<f32>> {
        let mut numerator = DVector::zeros(self.embedding.dimension);
        let mut denominator = 0.0;

        for v in neighbors {
            // Get kernel weight
            let k = self.distance.kernel(&self.center_vertex, v).await?;
            
            // Get centered embedding ψ(v)
            let psi_v = self.embedding.center_transform(v, &self.center_vertex).await?;
            
            // Accumulate: k_{u*}(v) · ψ(v)
            numerator += k * &psi_v;
            denominator += k;
        }

        if denominator > 0.0 {
            Ok(numerator / denominator)
        } else {
            Ok(numerator) // Fallback to zero vector
        }
    }
}

