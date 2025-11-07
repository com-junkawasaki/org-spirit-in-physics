//! Physics dynamics module
//!
//! 物理ダイナミクス実装：開放系×共振×相殺

pub mod dynamics;
pub mod potential;
pub mod resonance;
pub mod integration;
pub mod observation;
pub mod shacl_force;

pub use dynamics::Dynamics;
pub use potential::Potential;
pub use resonance::Resonance;
pub use integration::Integration;
pub use observation::Observation;
pub use shacl_force::ShaclForceIntegrator;

