//! SHACL Shape visualization as vector field
//!
//! SHACL Shapeの制約をベクトル場の力として可視化

use bevy::prelude::*;
use nalgebra::Vector3;
#[cfg(not(target_arch = "wasm32"))]
use crate::kg::terminus::TerminusClient;

/// SHACL constraint as force vector
#[derive(Debug, Clone)]
pub struct ShaclForce {
    /// Target node position
    pub target_pos: Vector3<f32>,
    /// Constraint center (ideal position)
    pub constraint_center: Vector3<f32>,
    /// Constraint type (minCount, maxCount, datatype, etc.)
    pub constraint_type: String,
    /// Force magnitude (based on constraint severity)
    pub force_magnitude: f32,
    /// Force direction (toward constraint center)
    pub force_direction: Vector3<f32>,
}

/// SHACL vector field renderer
#[derive(Resource)]
pub struct ShaclVectorFieldRenderer {
    /// SHACL forces
    forces: Vec<ShaclForce>,
}

impl ShaclVectorFieldRenderer {
    pub fn new() -> Self {
        Self {
            forces: Vec::new(),
        }
    }

    /// Load SHACL shapes from TerminusDB and convert to force vectors
    #[cfg(not(target_arch = "wasm32"))]
    pub async fn load_from_terminus(
        &mut self,
        client: &TerminusClient,
        shape_uri: Option<&str>,
    ) -> anyhow::Result<()> {
        // SPARQL query to get SHACL shapes
        let query = if let Some(shape) = shape_uri {
            format!(
                r#"
                PREFIX sh: <http://www.w3.org/ns/shacl#>
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                SELECT ?shape ?target ?constraint ?type WHERE {{
                    <{}> sh:targetClass ?target ;
                          sh:property ?constraint .
                    ?constraint sh:path ?path ;
                                ?type ?value .
                }}
                "#,
                shape
            )
        } else {
            r#"
            PREFIX sh: <http://www.w3.org/ns/shacl#>
            SELECT ?shape ?target ?constraint ?type WHERE {
                ?shape sh:targetClass ?target ;
                       sh:property ?constraint .
                ?constraint ?type ?value .
            }
            LIMIT 100
            "#
            .to_string()
        };

        let result = client.query_sparql(&query).await?;
        
        // Parse SHACL results and convert to forces
        // TODO: Parse actual SPARQL JSON result format
        
        Ok(())
    }

    /// Convert SHACL constraints to force vectors
    ///
    /// Each constraint creates a force that pulls nodes toward valid states
    pub fn constraints_to_forces(
        &mut self,
        constraints: &[(String, String, String)], // (target, constraint_type, value)
        target_positions: &std::collections::HashMap<String, Vector3<f32>>,
        constraint_centers: &std::collections::HashMap<String, Vector3<f32>>,
    ) {
        self.forces.clear();

        for (target, constraint_type, _value) in constraints {
            if let Some(&target_pos) = target_positions.get(target) {
                // Get constraint center (ideal position)
                let center = constraint_centers
                    .get(target)
                    .copied()
                    .unwrap_or(target_pos);

                // Calculate force direction (toward center)
                let direction = (center - target_pos).normalize();
                
                // Calculate force magnitude based on constraint type
                let magnitude = Self::constraint_force_magnitude(constraint_type);

                self.forces.push(ShaclForce {
                    target_pos,
                    constraint_center: center,
                    constraint_type: constraint_type.clone(),
                    force_magnitude: magnitude,
                    force_direction: direction * magnitude,
                });
            }
        }
    }

    /// Get force magnitude based on constraint type
    fn constraint_force_magnitude(constraint_type: &str) -> f32 {
        // Stronger forces for stricter constraints
        if constraint_type.contains("sh:minCount") || constraint_type.contains("sh:maxCount") {
            1.0 // Cardinality constraints are strong
        } else if constraint_type.contains("sh:datatype") || constraint_type.contains("sh:class") {
            0.8 // Type constraints
        } else if constraint_type.contains("sh:minLength") || constraint_type.contains("sh:maxLength") {
            0.6 // Length constraints
        } else if constraint_type.contains("sh:pattern") {
            0.5 // Pattern constraints
        } else {
            0.4 // Other constraints
        }
    }

    /// Render SHACL forces as force vectors in Bevy
    pub fn render(&self, commands: &mut Commands, meshes: &mut ResMut<Assets<Mesh>>, materials: &mut ResMut<Assets<StandardMaterial>>) {
        for force in &self.forces {
            // Render force vector as arrow from target position
            let direction = force.force_direction;
            let length = direction.norm().max(0.1); // Minimum length

            // Create arrow mesh (cylinder)
            let arrow_mesh = meshes.add(Cylinder::new(0.05, length));
            
            // Color based on constraint type
            let color_rgb = Self::constraint_color(&force.constraint_type);
            let arrow_material = materials.add(StandardMaterial {
                base_color: Color::rgb(color_rgb[0], color_rgb[1], color_rgb[2]),
                ..default()
            });

            // Convert Vector3 to Vec3
            let target_pos_vec3 = Vec3::new(force.target_pos.x, force.target_pos.y, force.target_pos.z);
            let direction_vec3 = Vec3::new(direction.x, direction.y, direction.z);
            
            commands.spawn(MaterialMeshBundle {
                mesh: arrow_mesh,
                material: arrow_material,
                transform: Transform::from_translation(target_pos_vec3)
                    .looking_to(direction_vec3, Vec3::Y),
                ..default()
            });

            // Render constraint center as sphere
            let sphere_mesh = meshes.add(Sphere::new(0.1));
            let sphere_material = materials.add(StandardMaterial {
                base_color: Color::rgb(1.0, 0.5, 0.5), // Red for constraint centers
                ..default()
            });

            // Convert Vector3 to Vec3
            let center_vec3 = Vec3::new(force.constraint_center.x, force.constraint_center.y, force.constraint_center.z);
            
            commands.spawn(MaterialMeshBundle {
                mesh: sphere_mesh,
                material: sphere_material,
                transform: Transform::from_translation(center_vec3),
                ..default()
            });
        }
    }

    /// Get color for constraint type
    fn constraint_color(constraint_type: &str) -> [f32; 3] {
        if constraint_type.contains("sh:minCount") || constraint_type.contains("sh:maxCount") {
            [1.0, 0.0, 0.0] // Red for cardinality
        } else if constraint_type.contains("sh:datatype") || constraint_type.contains("sh:class") {
            [0.0, 1.0, 0.0] // Green for type
        } else if constraint_type.contains("sh:pattern") {
            [0.0, 0.0, 1.0] // Blue for pattern
        } else {
            [0.5, 0.5, 0.5] // Gray for others
        }
    }

    /// Get all forces
    pub fn forces(&self) -> &[ShaclForce] {
        &self.forces
    }

    /// Calculate total force at a position (for integration with physics)
    pub fn force_at(&self, position: &Vector3<f32>) -> Vector3<f32> {
        let mut total_force = Vector3::zeros();
        let influence_radius = 1.0; // Distance at which constraints have influence

        for force in &self.forces {
            let distance = (position - force.target_pos).norm();
            if distance < influence_radius {
                // Inverse distance weighting
                let weight = (1.0 - distance / influence_radius).max(0.0);
                total_force += force.force_direction * weight;
            }
        }

        total_force
    }
}

impl Default for ShaclVectorFieldRenderer {
    fn default() -> Self {
        Self::new()
    }
}

