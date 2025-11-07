//! Great Spirit GPU Physics System
//!
//! 物理法則に基づく「スピリット位置」のリアルタイム計算システム。
//! 開放系ダイナミクス、共振駆動、相殺メカニズムを統合し、wgpuでGPU並列処理を実現。

pub mod config;
pub mod physics;
pub mod gpu;
pub mod kg;
pub mod graphql;
pub mod visualization;

pub use config::Config;

