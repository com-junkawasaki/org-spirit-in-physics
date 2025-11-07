//! Emotion Analysis Module
//!
//! マルチモーダル（画像・音声）から感情分析を実行するモジュール。
//! Candle/ONNXを使用してHume AI相当の感情次元を推定する。

pub mod analyzer;
pub mod face_detector;
pub mod audio_processor;
pub mod image_processor;
pub mod hume_dimensions;

pub use analyzer::EmotionAnalyzer;
pub use face_detector::FaceDetector;
pub use audio_processor::AudioProcessor;
pub use image_processor::ImageProcessor;
pub use hume_dimensions::EmotionDimensions;

