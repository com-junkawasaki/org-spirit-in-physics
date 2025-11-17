// Merkle DAG: graphql.service.types.force_graph
// Force Graph 3D visualization types for GraphQL

use async_graphql::*;
use chrono::{DateTime, Utc};

#[derive(SimpleObject, Clone)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[derive(SimpleObject, Clone)]
pub struct NodePosition {
    pub id: String,
    pub position: Vec3,
    pub velocity: Vec3,
}

#[derive(SimpleObject)]
pub struct ForceGraphUpdate {
    pub simulation_id: String,
    pub timestamp: DateTime<Utc>,
    pub nodes: Vec<NodePosition>,
    pub iteration: i32,
}

#[derive(InputObject)]
pub struct Vec3Input {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[derive(InputObject)]
pub struct NodeInput {
    pub id: String,
    pub label: String,
    pub scale: f32,
    pub axis: Option<Vec3Input>,
    pub fixed: Option<bool>,
    pub initial: Option<Vec3Input>,
    pub color: Option<String>,
}

#[derive(InputObject)]
pub struct LinkInput {
    pub source: i32,
    pub target: i32,
    pub weight: f32,
    pub mode: Option<String>,
    pub l0: Option<f32>,
    pub k: Option<f32>,
}

#[derive(InputObject)]
pub struct PhysicsParamsInput {
    pub spring_k: Option<f32>,
    pub repulsion_k: Option<f32>,
    pub damping: Option<f32>,
    pub rest_length: Option<f32>,
    pub max_speed: Option<f32>,
    pub shell_radius: Option<f32>,
    pub shell_k: Option<f32>,
    pub shell_radius_outer: Option<f32>,
    pub shell_k_outer: Option<f32>,
    pub radial_out_k: Option<f32>,
    pub min_sep: Option<f32>,
    pub sep_k: Option<f32>,
    pub constraint_iters: Option<i32>,
    pub constraint_stiffness: Option<f32>,
}

#[derive(InputObject)]
pub struct ForceGraphSimulationInput {
    pub nodes: Vec<NodeInput>,
    pub links: Vec<LinkInput>,
    pub physics: Option<PhysicsParamsInput>,
    pub max_fps: Option<i32>,
}

