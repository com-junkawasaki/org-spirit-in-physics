//! Visualization module (Bevy)

pub mod renderer;
pub mod camera;
pub mod vector_field;
pub mod potential_surface;
pub mod resonance_bands;
pub mod rdf_field;
pub mod shacl_field;
pub mod emotion_timeline;
pub mod emotion_heatmap;
pub mod person_network;

pub use renderer::VisualizationRenderer;
pub use rdf_field::RdfVectorFieldRenderer;
pub use shacl_field::ShaclVectorFieldRenderer;
pub use emotion_timeline::EmotionTimelineRenderer;
pub use emotion_heatmap::EmotionHeatmapRenderer;
pub use person_network::PersonNetworkRenderer;

