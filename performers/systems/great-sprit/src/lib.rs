//! Great Spirit GPU Physics System
//!
//! 物理法則に基づく「スピリット位置」のリアルタイム計算システム。
//! 開放系ダイナミクス、共振駆動、相殺メカニズムを統合し、wgpuでGPU並列処理を実現。

// Server-side modules (not available in WASM)
#[cfg(not(target_arch = "wasm32"))]
pub mod config;
#[cfg(not(target_arch = "wasm32"))]
pub mod physics;
#[cfg(not(target_arch = "wasm32"))]
pub mod gpu;
#[cfg(not(target_arch = "wasm32"))]
pub mod kg;
#[cfg(not(target_arch = "wasm32"))]
pub mod graphql;
#[cfg(not(target_arch = "wasm32"))]
pub mod emotion;
#[cfg(not(target_arch = "wasm32"))]
pub mod capture;
#[cfg(not(target_arch = "wasm32"))]
pub mod identity;
#[cfg(not(target_arch = "wasm32"))]
pub mod pipeline;

// Visualization module (available in both native and WASM)
pub mod visualization;

#[cfg(not(target_arch = "wasm32"))]
pub use config::Config;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
use bevy::prelude::*;

/// WebAssembly entry point for Bevy visualization
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn start_bevy_app(canvas_id: &str) -> Result<(), JsValue> {
    console_error_panic_hook::set_once();
    
    let mut app = crate::visualization::renderer::VisualizationRenderer::create_app();
    
    // Configure Bevy for WebAssembly
    app.add_plugins(DefaultPlugins.set(WindowPlugin {
        primary_window: Some(Window {
            canvas: Some(canvas_id.into()),
            ..default()
        }),
        ..default()
    }));
    
    // Run the app
    app.run();
    
    Ok(())
}

/// Initialize WebAssembly module
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

#[cfg(target_arch = "wasm32")]
use crate::visualization::renderer::{RdfData, EmotionData};

/// Load RDF data from GraphQL (called from JavaScript)
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn load_rdf_data(triples_json: &str) -> Result<(), JsValue> {
    use serde_json::Value;
    
    let triples: Value = serde_json::from_str(triples_json)
        .map_err(|e| JsValue::from_str(&format!("JSON parse error: {}", e)))?;
    
    // TODO: Update Bevy resource with RDF data
    // This requires access to Bevy World, which needs to be stored globally
    // or passed through a different mechanism
    
    Ok(())
}

/// Load emotion data from GraphQL (called from JavaScript)
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn load_emotion_data(observations_json: &str) -> Result<(), JsValue> {
    use serde_json::Value;
    
    let observations: Value = serde_json::from_str(observations_json)
        .map_err(|e| JsValue::from_str(&format!("JSON parse error: {}", e)))?;
    
    // TODO: Update Bevy resource with emotion data
    // This requires access to Bevy World
    
    Ok(())
}

