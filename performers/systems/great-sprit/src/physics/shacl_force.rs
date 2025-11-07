//! SHACL constraint force integration
//!
//! SHACL Shapeの制約を物理ダイナミクスに統合

use nalgebra::Vector3;
use crate::visualization::shacl_field::ShaclVectorFieldRenderer;

/// SHACL constraint force integrator
pub struct ShaclForceIntegrator {
    shacl_renderer: ShaclVectorFieldRenderer,
    force_scale: f32,
}

impl ShaclForceIntegrator {
    pub fn new(shacl_renderer: ShaclVectorFieldRenderer, force_scale: f32) -> Self {
        Self {
            shacl_renderer,
            force_scale,
        }
    }

    /// Calculate SHACL constraint force at position
    ///
    /// This force pulls the spirit position toward valid states according to SHACL constraints
    pub fn constraint_force(&self, position: &Vector3<f32>) -> Vector3<f32> {
        self.shacl_renderer.force_at(position) * self.force_scale
    }

    /// Integrate SHACL force into dynamics equation
    ///
    /// Modified equation: ẍ = -∇U(s) - C·ṡ + α(ψ̄_𝒩(t) - s) + β·R(t) + γ·F_shacl(s)
    pub fn integrate_into_acceleration(
        &self,
        position: &Vector3<f32>,
        base_acceleration: &Vector3<f32>,
        shacl_force_weight: f32,
    ) -> Vector3<f32> {
        let shacl_force = self.constraint_force(position);
        base_acceleration + shacl_force_weight * shacl_force
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shacl_force_integration() {
        let renderer = ShaclVectorFieldRenderer::new();
        let integrator = ShaclForceIntegrator::new(renderer, 1.0);
        let position = Vector3::new(0.0, 0.0, 0.0);
        let force = integrator.constraint_force(&position);
        // Force should be zero if no constraints are present
        assert_eq!(force.norm(), 0.0);
    }
}

