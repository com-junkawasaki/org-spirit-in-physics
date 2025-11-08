//! Bevy-based visualization renderer
//!
//! RDF、SHACL Shape、物理ダイナミクスを統合した可視化

use bevy::prelude::*;
#[cfg(not(target_arch = "wasm32"))]
use crate::gpu::buffers::Buffers;
use crate::visualization::rdf_field::RdfVectorFieldRenderer;
use crate::visualization::shacl_field::ShaclVectorFieldRenderer;

/// Visualization renderer using Bevy
pub struct VisualizationRenderer {
    rdf_renderer: RdfVectorFieldRenderer,
    shacl_renderer: ShaclVectorFieldRenderer,
}

impl VisualizationRenderer {
    pub fn new() -> Self {
        Self {
            rdf_renderer: RdfVectorFieldRenderer::new(),
            shacl_renderer: ShaclVectorFieldRenderer::new(),
        }
    }

    /// Create Bevy app for visualization
    pub fn create_app() -> App {
        let mut app = App::new();
        
        // Configure plugins based on target platform
        #[cfg(target_arch = "wasm32")]
        {
            // WebAssembly: Use WebGL2 renderer
            app.add_plugins(DefaultPlugins.set(WindowPlugin {
                primary_window: None, // Will be set by caller
                ..default()
            }));
        }
        
        #[cfg(not(target_arch = "wasm32"))]
        {
            // Native: Use default plugins
            app.add_plugins(DefaultPlugins);
        }
        
        app.init_resource::<RdfData>()
            .init_resource::<EmotionData>()
            .add_systems(Startup, setup_visualization)
            .add_systems(Update, (
                update_rdf_vectors,
                update_shacl_forces,
                update_visualization,
            ));

        app
    }

    /// Get RDF renderer
    pub fn rdf_renderer(&mut self) -> &mut RdfVectorFieldRenderer {
        &mut self.rdf_renderer
    }

    /// Get SHACL renderer
    pub fn shacl_renderer(&mut self) -> &mut ShaclVectorFieldRenderer {
        &mut self.shacl_renderer
    }
}

impl Default for VisualizationRenderer {
    fn default() -> Self {
        Self::new()
    }
}

/// Setup visualization
fn setup_visualization(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
) {
    // Setup camera
    commands.spawn(Camera3dBundle {
        transform: Transform::from_xyz(10.0, 10.0, 10.0)
            .looking_at(Vec3::ZERO, Vec3::Y),
        ..default()
    });

    // Setup lighting
    commands.spawn(DirectionalLightBundle {
        directional_light: DirectionalLight {
            illuminance: 3000.0,
            ..default()
        },
        transform: Transform::from_rotation(Quat::from_euler(EulerRot::XYZ, -0.5, -0.5, 0.0)),
        ..default()
    });
}

/// Resource to store RDF data from GraphQL
#[derive(Resource, Default)]
pub struct RdfData {
    pub triples: Vec<(String, String, String)>, // (subject, predicate, object)
    pub updated: bool,
}

/// Resource to store emotion data from GraphQL
#[derive(Resource, Default)]
pub struct EmotionData {
    pub observations: Vec<(String, f32, f32, f32)>, // (person_uri, valence, arousal, engagement)
    pub updated: bool,
}

/// Update RDF vector visualization
fn update_rdf_vectors(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
    rdf_renderer: ResMut<RdfVectorFieldRenderer>,
    rdf_data: Res<RdfData>,
) {
    if rdf_data.updated {
        // TODO: Render RDF vectors from data
        // For now, this is a placeholder
        // rdf_renderer.render(&mut commands, &mut meshes, &mut materials);
    }
}

/// Update SHACL force visualization
fn update_shacl_forces(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
    shacl_renderer: ResMut<ShaclVectorFieldRenderer>,
    emotion_data: Res<EmotionData>,
) {
    if emotion_data.updated {
        // TODO: Render emotion network from data
        // For now, this is a placeholder
        // shacl_renderer.render(&mut commands, &mut meshes, &mut materials);
    }
}

/// Update visualization system
fn update_visualization(
    // TODO: Add queries for visualization entities
) {
    // TODO: Implement visualization update
}

