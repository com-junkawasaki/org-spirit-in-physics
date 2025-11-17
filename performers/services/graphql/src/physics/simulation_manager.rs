// Merkle DAG: graphql.service.physics.simulation_manager
// Simulation manager for Force Graph 3D simulations

use crate::physics::force_graph::*;
use crate::types::*;
use async_stream::stream;
use chrono::Utc;
use futures::Stream;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{interval, Duration};

pub struct SimulationManager {
    simulations: Arc<RwLock<HashMap<String, Arc<RwLock<ForceGraphSimulation>>>>>,
}

impl SimulationManager {
    pub fn new() -> Self {
        Self {
            simulations: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn create_simulation(
        &self,
        simulation_id: String,
        input: ForceGraphSimulationInput,
    ) -> Result<(), String> {
        let simulation = Arc::new(RwLock::new(ForceGraphSimulation::new(input)));
        let mut sims = self.simulations.write().await;
        sims.insert(simulation_id, simulation);
        Ok(())
    }

    pub async fn get_simulation(
        &self,
        simulation_id: &str,
    ) -> Result<Arc<RwLock<ForceGraphSimulation>>, String> {
        let sims = self.simulations.read().await;
        sims.get(simulation_id)
            .cloned()
            .ok_or_else(|| format!("Simulation {} not found", simulation_id))
    }

    pub async fn update_physics(
        &self,
        simulation_id: &str,
        physics: PhysicsParamsInput,
    ) -> Result<(), String> {
        let simulation = self.get_simulation(simulation_id).await?;
        let mut sim = simulation.write().await;
        sim.update_physics(physics);
        Ok(())
    }

    pub async fn stop_simulation(&self, simulation_id: &str) -> Result<(), String> {
        let mut sims = self.simulations.write().await;
        sims.remove(simulation_id)
            .ok_or_else(|| format!("Simulation {} not found", simulation_id))?;
        Ok(())
    }

    pub async fn get_simulation_stream(
        &self,
        simulation_id: &str,
        max_fps: i32,
    ) -> Result<impl Stream<Item = ForceGraphUpdate>, String> {
        let simulation = self.get_simulation(simulation_id).await?;

        let interval_ms = if max_fps > 0 {
            1000 / max_fps
        } else {
            16 // ~60fps default
        };

        let simulation_id = simulation_id.to_string();
        let simulation_clone = simulation.clone();

        let stream = stream! {
            let mut interval = interval(Duration::from_millis(interval_ms));
            loop {
                interval.tick().await;

                let mut sim = simulation_clone.write().await;
                let delta_time = interval_ms as f32 / 1000.0;
                sim.step(delta_time);

                let update = ForceGraphUpdate {
                    simulation_id: simulation_id.clone(),
                    timestamp: Utc::now(),
                    nodes: sim.get_node_positions(),
                    iteration: sim.iteration(),
                };

                yield update;
            }
        };

        Ok(stream)
    }
}

impl Default for SimulationManager {
    fn default() -> Self {
        Self::new()
    }
}

