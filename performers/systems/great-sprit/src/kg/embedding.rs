//! RDF/OWL embedding φ(v)

use anyhow::Result;
use nalgebra::DVector;
use crate::kg::terminus::TerminusClient;

/// Embedding vector
pub type EmbeddingVector = DVector<f32>;

/// Embedding manager
pub struct Embedding {
    client: TerminusClient,
    pub dimension: usize,
}

impl Embedding {
    pub fn new(client: TerminusClient, dimension: usize) -> Self {
        Self { client, dimension }
    }

    /// Get embedding φ(v) for vertex v
    pub async fn get(&self, vertex: &str) -> Result<EmbeddingVector> {
        let vec = self.client.query_embeddings(vertex).await?;
        
        if vec.len() != self.dimension {
            anyhow::bail!("Embedding dimension mismatch: expected {}, got {}", self.dimension, vec.len());
        }

        Ok(DVector::from_vec(vec))
    }

    /// あなた中心変換: ψ(v) = φ(v) - φ(u*)
    pub async fn center_transform(&self, vertex: &str, center_vertex: &str) -> Result<EmbeddingVector> {
        let phi_v = self.get(vertex).await?;
        let phi_u_star = self.get(center_vertex).await?;
        
        Ok(phi_v - phi_u_star)
    }
}

