// Merkle DAG: graphql.service.physics.force_graph
// Force-directed graph physics simulation engine
// Implements the same physics as WebGPU shader in Force3DWordGraphTypeGPU.tsx

use crate::types::*;
use std::sync::Arc;

#[derive(Clone)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Vec3 {
    pub fn new(x: f32, y: f32, z: f32) -> Self {
        Self { x, y, z }
    }

    pub fn zero() -> Self {
        Self { x: 0.0, y: 0.0, z: 0.0 }
    }

    pub fn length(&self) -> f32 {
        (self.x * self.x + self.y * self.y + self.z * self.z).sqrt()
    }

    pub fn length_sq(&self) -> f32 {
        self.x * self.x + self.y * self.y + self.z * self.z
    }

    pub fn normalize(&self) -> Self {
        let len = self.length();
        if len > 1e-6 {
            Self {
                x: self.x / len,
                y: self.y / len,
                z: self.z / len,
            }
        } else {
            Self::zero()
        }
    }

    pub fn dot(&self, other: &Self) -> f32 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }

    pub fn scale(&self, s: f32) -> Self {
        Self {
            x: self.x * s,
            y: self.y * s,
            z: self.z * s,
        }
    }
}

impl std::ops::Add for Vec3 {
    type Output = Self;
    fn add(self, other: Self) -> Self {
        Self {
            x: self.x + other.x,
            y: self.y + other.y,
            z: self.z + other.z,
        }
    }
}

impl std::ops::Sub for Vec3 {
    type Output = Self;
    fn sub(self, other: Self) -> Self {
        Self {
            x: self.x - other.x,
            y: self.y - other.y,
            z: self.z - other.z,
        }
    }
}

impl std::ops::AddAssign for Vec3 {
    fn add_assign(&mut self, other: Self) {
        self.x += other.x;
        self.y += other.y;
        self.z += other.z;
    }
}

#[derive(Clone)]
pub struct Node {
    pub id: String,
    pub position: Vec3,
    pub velocity: Vec3,
    pub scale: f32,
    pub fixed: bool,
    pub initial: Option<Vec3>,
}

#[derive(Clone)]
pub struct Link {
    pub source: usize,
    pub target: usize,
    pub weight: f32,
    pub mode: LinkMode,
    pub l0: Option<f32>,
    pub k: Option<f32>,
}

#[derive(Clone, Copy, PartialEq)]
pub enum LinkMode {
    Default,
    Tension,
    Compression,
}

impl From<Option<&String>> for LinkMode {
    fn from(mode: Option<&String>) -> Self {
        match mode {
            Some(s) if s == "tension" => LinkMode::Tension,
            Some(s) if s == "compression" => LinkMode::Compression,
            _ => LinkMode::Default,
        }
    }
}

#[derive(Clone)]
pub struct PhysicsParams {
    pub spring_k: f32,
    pub repulsion_k: f32,
    pub damping: f32,
    pub rest_length: f32,
    pub max_speed: f32,
    pub shell_radius: f32,
    pub shell_k: f32,
    pub shell_radius_outer: f32,
    pub shell_k_outer: f32,
    pub radial_out_k: f32,
    pub min_sep: f32,
    pub sep_k: f32,
    pub constraint_iters: i32,
    pub constraint_stiffness: f32,
}

impl Default for PhysicsParams {
    fn default() -> Self {
        Self {
            spring_k: 2.0,
            repulsion_k: 3500.0,
            damping: 0.93,
            rest_length: 90.0,
            max_speed: 220.0,
            shell_radius: 500.0,
            shell_k: 1.2,
            shell_radius_outer: 800.0,
            shell_k_outer: 0.6,
            radial_out_k: 120.0,
            min_sep: 60.0,
            sep_k: 5000.0,
            constraint_iters: 2,
            constraint_stiffness: 0.5,
        }
    }
}

impl From<Option<&PhysicsParamsInput>> for PhysicsParams {
    fn from(input: Option<&PhysicsParamsInput>) -> Self {
        let default = Self::default();
        match input {
            Some(p) => Self {
                spring_k: p.spring_k.unwrap_or(default.spring_k),
                repulsion_k: p.repulsion_k.unwrap_or(default.repulsion_k),
                damping: p.damping.unwrap_or(default.damping),
                rest_length: p.rest_length.unwrap_or(default.rest_length),
                max_speed: p.max_speed.unwrap_or(default.max_speed),
                shell_radius: p.shell_radius.unwrap_or(default.shell_radius),
                shell_k: p.shell_k.unwrap_or(default.shell_k),
                shell_radius_outer: p
                    .shell_radius_outer
                    .unwrap_or(default.shell_radius_outer),
                shell_k_outer: p.shell_k_outer.unwrap_or(default.shell_k_outer),
                radial_out_k: p.radial_out_k.unwrap_or(default.radial_out_k),
                min_sep: p.min_sep.unwrap_or(default.min_sep),
                sep_k: p.sep_k.unwrap_or(default.sep_k),
                constraint_iters: p.constraint_iters.unwrap_or(default.constraint_iters),
                constraint_stiffness: p
                    .constraint_stiffness
                    .unwrap_or(default.constraint_stiffness),
            },
            None => default,
        }
    }
}

pub struct ForceGraphSimulation {
    nodes: Vec<Node>,
    links: Vec<Link>,
    physics: PhysicsParams,
    iteration: i32,
}

impl ForceGraphSimulation {
    pub fn new(input: ForceGraphSimulationInput) -> Self {
        let physics = PhysicsParams::from(input.physics.as_ref());

        // Initialize nodes
        let mut nodes = Vec::new();
        for node_input in input.nodes {
            let initial = node_input.initial.map(|v| Vec3::new(v.x, v.y, v.z));
            let position = if let Some(init) = &initial {
                init.clone()
            } else {
                // Random spherical distribution
                use std::collections::hash_map::DefaultHasher;
                use std::hash::{Hash, Hasher};
                let mut hasher = DefaultHasher::new();
                node_input.id.hash(&mut hasher);
                let hash = hasher.finish();
                let rng = (hash as f32) / (u64::MAX as f32);
                let theta = rng * std::f32::consts::PI * 2.0;
                let phi = ((rng * 2.0 - 1.0) * 0.999).acos(); // Clamp to avoid NaN
                let r = 200.0 + (rng * 200.0);
                Vec3::new(
                    r * phi.sin() * theta.cos(),
                    r * phi.sin() * theta.sin(),
                    r * phi.cos(),
                )
            };

            nodes.push(Node {
                id: node_input.id,
                position: position.clone(),
                velocity: Vec3::zero(),
                scale: node_input.scale,
                fixed: node_input.fixed.unwrap_or(false),
                initial,
            });
        }

        // Initialize links
        let links: Vec<Link> = input
            .links
            .into_iter()
            .map(|link_input| Link {
                source: link_input.source as usize,
                target: link_input.target as usize,
                weight: link_input.weight,
                mode: LinkMode::from(link_input.mode.as_ref()),
                l0: link_input.l0,
                k: link_input.k,
            })
            .collect();

        Self {
            nodes,
            links,
            physics,
            iteration: 0,
        }
    }

    pub fn step(&mut self, delta_time: f32) {
        // Apply forces to each node
        for i in 0..self.nodes.len() {
            if self.nodes[i].fixed {
                continue;
            }

            let mut force = Vec3::zero();

            // Repulsion forces from all other nodes
            for j in 0..self.nodes.len() {
                if i == j {
                    continue;
                }

                let dx = &self.nodes[i].position - &self.nodes[j].position;
                let dist_sq = dx.length_sq() + 1e-6;
                let dist = dist_sq.sqrt();

                let mut repulsion_force = self.physics.repulsion_k / dist_sq;

                // Separation force
                if self.physics.min_sep > 0.0
                    && self.physics.sep_k > 0.0
                    && dist < self.physics.min_sep
                {
                    let s = (self.physics.min_sep - dist) / self.physics.min_sep.max(1.0);
                    repulsion_force += self.physics.sep_k * s * s;
                }

                force += dx.normalize().scale(repulsion_force);
            }

            // Spring forces from links
            for link in &self.links {
                let other_idx = if link.source == i {
                    link.target
                } else if link.target == i {
                    link.source
                } else {
                    continue;
                };

                let other = &self.nodes[other_idx];
                let dx = &other.position - &self.nodes[i].position;
                let dist = dx.length() + 1e-6;

                let w_clamped = link.weight.clamp(0.0, 1.0);
                let w_amp = w_clamped;

                let l0_guess = if link.mode == LinkMode::Compression {
                    (self.physics.rest_length * (1.0 + (1.0 - w_clamped) * 1.2)).max(10.0)
                } else {
                    (self.physics.rest_length * (1.0 - 0.7 * w_clamped)).max(10.0)
                };

                let l0_final = link.l0.unwrap_or(l0_guess);
                let k_final = link
                    .k
                    .unwrap_or(self.physics.spring_k * (0.1 + 0.9 * w_amp));

                let x = dist - l0_final;
                let mut spring_force = 0.0;

                match link.mode {
                    LinkMode::Tension => {
                        if x > 0.0 {
                            spring_force = k_final * x;
                        }
                    }
                    LinkMode::Compression => {
                        if x < 0.0 {
                            spring_force = k_final * x;
                        }
                    }
                    LinkMode::Default => {
                        spring_force = k_final * x;
                    }
                }

                let sign = if link.source == i { 1.0 } else { -1.0 };
                force += dx.normalize().scale(spring_force * sign);
            }

            // Shell forces
            let rlen = self.nodes[i].position.length() + 1e-6;
            let radial_dir = self.nodes[i].position.normalize();

            // Radial force towards shell radius
            let fr = (self.physics.shell_radius - rlen) * self.physics.shell_k;
            force += radial_dir.scale(fr * 0.016);

            // Outer shell attraction
            let fr_outer = (self.physics.shell_radius_outer - rlen) * self.physics.shell_k_outer;
            force += radial_dir.scale(fr_outer * 0.016);

            // Radial repulsion from center
            if self.physics.radial_out_k > 0.0 {
                let fr_radial = self.physics.radial_out_k / (1.0 + rlen);
                force += radial_dir.scale(fr_radial * delta_time);
            }

            // Update velocity
            self.nodes[i].velocity += force.scale(delta_time);

            // Apply damping
            self.nodes[i].velocity = self.nodes[i].velocity.scale(self.physics.damping);

            // Limit speed
            let speed = self.nodes[i].velocity.length();
            if speed > self.physics.max_speed {
                self.nodes[i].velocity = self.nodes[i].velocity.normalize().scale(self.physics.max_speed);
            }

            // Update position
            self.nodes[i].position += self.nodes[i].velocity.scale(delta_time);
        }

        // Position-based dynamics constraint solver
        self.apply_constraints();

        self.iteration += 1;
    }

    fn apply_constraints(&mut self) {
        let base_min = self.physics.min_sep;
        let stiffness = self.physics.constraint_stiffness;
        let iters = self.physics.constraint_iters.max(1);
        let scale_factor = 6.0;

        for _iter in 0..iters {
            for i in 0..self.nodes.len() {
                for j in (i + 1)..self.nodes.len() {
                    // Skip if both are fixed
                    if self.nodes[i].fixed && self.nodes[j].fixed {
                        continue;
                    }

                    let dx = &self.nodes[i].position - &self.nodes[j].position;
                    let dist = dx.length().max(1.0);

                    let ri = self.nodes[i].scale * scale_factor;
                    let rj = self.nodes[j].scale * scale_factor;
                    let min_d = (base_min + ri + rj).max(10.0);

                    if dist < min_d {
                        let overlap = min_d - dist;
                        let ux = dx.normalize();
                        let corr = overlap * stiffness;

                        if self.nodes[i].fixed && !self.nodes[j].fixed {
                            self.nodes[j].position = &self.nodes[j].position - &ux.scale(corr);
                        } else if !self.nodes[i].fixed && self.nodes[j].fixed {
                            self.nodes[i].position = &self.nodes[i].position + &ux.scale(corr);
                        } else if !self.nodes[i].fixed && !self.nodes[j].fixed {
                            let half = corr * 0.5;
                            self.nodes[i].position = &self.nodes[i].position + &ux.scale(half);
                            self.nodes[j].position = &self.nodes[j].position - &ux.scale(half);
                        }
                    }
                }
            }
        }
    }

    pub fn get_node_positions(&self) -> Vec<crate::types::NodePosition> {
        self.nodes
            .iter()
            .map(|node| crate::types::NodePosition {
                id: node.id.clone(),
                position: crate::types::Vec3 {
                    x: node.position.x,
                    y: node.position.y,
                    z: node.position.z,
                },
                velocity: crate::types::Vec3 {
                    x: node.velocity.x,
                    y: node.velocity.y,
                    z: node.velocity.z,
                },
            })
            .collect()
    }

    pub fn update_physics(&mut self, physics: PhysicsParamsInput) {
        self.physics = PhysicsParams::from(Some(&physics));
    }

    pub fn iteration(&self) -> i32 {
        self.iteration
    }
}

