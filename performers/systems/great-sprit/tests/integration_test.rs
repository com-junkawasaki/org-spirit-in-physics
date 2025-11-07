//! Integration tests

#[cfg(test)]
mod tests {
    use anyhow::Result;

    #[tokio::test]
    async fn test_gpu_device_init() -> Result<()> {
        // Test GPU device initialization
        let device = great_sprit::gpu::device::GpuDevice::init().await?;
        assert!(device.limits().max_compute_workgroup_storage_size > 0);
        Ok(())
    }

    #[test]
    fn test_physics_dynamics() {
        use great_sprit::physics::dynamics::{Dynamics, DynamicsParams};
        use nalgebra::Vector3;

        let s = Vector3::new(0.0, 0.0, 0.0);
        let s_dot = Vector3::new(1.0, 0.0, 0.0);
        let potential_gradient = Vector3::new(0.1, 0.0, 0.0);
        let neighbor_centroid = Vector3::new(1.0, 0.0, 0.0);
        let resonance = Vector3::new(0.0, 0.1, 0.0);
        let params = DynamicsParams::default();

        let accel = Dynamics::compute_acceleration(
            &s,
            &s_dot,
            &potential_gradient,
            &neighbor_centroid,
            &resonance,
            &params,
        );

        assert!(accel.norm() > 0.0);
    }

    #[test]
    fn test_potential() {
        use great_sprit::physics::potential::{Potential, PotentialWell};
        use nalgebra::Vector3;

        let potential = Potential::new(vec![PotentialWell {
            center: Vector3::zeros(),
            strength: 1.0,
        }]);

        let s = Vector3::new(1.0, 0.0, 0.0);
        let value = potential.value(&s);
        assert!(value > 0.0);

        let gradient = potential.gradient(&s);
        assert!(gradient.norm() > 0.0);
    }
}

