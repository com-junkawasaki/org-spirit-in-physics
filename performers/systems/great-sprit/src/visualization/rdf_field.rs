//! RDF graph visualization as vector field
//!
//! RDFトリプル（subject-predicate-object）をベクトル場として可視化

use bevy::prelude::*;
use nalgebra::Vector3;
use crate::kg::terminus::TerminusClient;

/// RDF triple as vector
#[derive(Debug, Clone)]
pub struct RdfVector {
    /// Subject position (start point)
    pub subject_pos: Vector3<f32>,
    /// Object position (end point)
    pub object_pos: Vector3<f32>,
    /// Predicate URI
    pub predicate: String,
    /// Vector magnitude (based on predicate importance)
    pub magnitude: f32,
}

/// RDF vector field renderer
#[derive(Resource)]
pub struct RdfVectorFieldRenderer {
    /// RDF vectors
    vectors: Vec<RdfVector>,
}

impl RdfVectorFieldRenderer {
    pub fn new() -> Self {
        Self {
            vectors: Vec::new(),
        }
    }

    /// Load RDF triples from TerminusDB and convert to vectors
    pub async fn load_from_terminus(
        &mut self,
        client: &TerminusClient,
        subject_uri: Option<&str>,
    ) -> anyhow::Result<()> {
        // SPARQL query to get triples
        let query = if let Some(subj) = subject_uri {
            format!(
                r#"
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                SELECT ?s ?p ?o WHERE {{
                    <{}> ?p ?o .
                }}
                "#,
                subj
            )
        } else {
            r#"
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            SELECT ?s ?p ?o WHERE {
                ?s ?p ?o .
            }
            LIMIT 1000
            "#
            .to_string()
        };

        let result = client.query_sparql(&query).await?;
        
        // Parse SPARQL results and convert to vectors
        // TODO: Parse actual SPARQL JSON result format
        // For now, create placeholder vectors
        
        Ok(())
    }

    /// Convert RDF triples to vector field
    ///
    /// Each triple (s, p, o) becomes a vector from s's embedding position to o's embedding position
    pub fn triples_to_vectors(
        &mut self,
        triples: &[(String, String, String)], // (subject, predicate, object)
        embeddings: &std::collections::HashMap<String, Vector3<f32>>,
    ) {
        self.vectors.clear();

        for (subject, predicate, object) in triples {
            if let (Some(&subj_pos), Some(&obj_pos)) =
                (embeddings.get(subject), embeddings.get(object))
            {
                // Calculate predicate weight (simplified: based on predicate type)
                let magnitude = Self::predicate_weight(predicate);

                self.vectors.push(RdfVector {
                    subject_pos: subj_pos,
                    object_pos: obj_pos,
                    predicate: predicate.clone(),
                    magnitude,
                });
            }
        }
    }

    /// Get predicate weight for visualization
    fn predicate_weight(predicate: &str) -> f32 {
        // Weight based on predicate importance
        if predicate.contains("rdf:type") || predicate.contains("rdfs:subClassOf") {
            1.0 // Strong relationship
        } else if predicate.contains("rdfs:label") || predicate.contains("rdfs:comment") {
            0.3 // Weak relationship
        } else {
            0.6 // Medium relationship
        }
    }

    /// Render RDF vectors as arrows in Bevy
    pub fn render(&self, commands: &mut Commands, meshes: &mut ResMut<Assets<Mesh>>, materials: &mut ResMut<Assets<StandardMaterial>>) {
        for vector in &self.vectors {
            // Calculate arrow direction and length
            let direction = vector.object_pos - vector.subject_pos;
            let length = direction.norm() * vector.magnitude;
            let midpoint = vector.subject_pos + direction * 0.5;

            // Create arrow mesh (simplified: use cylinder for now)
            // TODO: Create proper arrow mesh with head
            let arrow_mesh = meshes.add(Cylinder::new(0.05, length));
            let arrow_material = materials.add(StandardMaterial {
                base_color: Color::rgb(0.5, 0.7, 1.0),
                ..default()
            });

            // Convert Vector3 to Vec3
            let midpoint_vec3 = Vec3::new(midpoint.x, midpoint.y, midpoint.z);
            let direction_vec3 = Vec3::new(direction.x, direction.y, direction.z);
            
            commands.spawn(MaterialMeshBundle {
                mesh: arrow_mesh,
                material: arrow_material,
                transform: Transform::from_translation(midpoint_vec3)
                    .looking_to(direction_vec3, Vec3::Y),
                ..default()
            });
        }
    }

    /// Get all vectors
    pub fn vectors(&self) -> &[RdfVector] {
        &self.vectors
    }
}

impl Default for RdfVectorFieldRenderer {
    fn default() -> Self {
        Self::new()
    }
}

