//! Capture Module
//!
//! マルチモーダル入力（スクリーンショット・カメラ・音声ストリーム）を取得するモジュール。

pub mod screen_capture;
pub mod camera_stream;
pub mod audio_stream;
pub mod file_upload;

pub use screen_capture::ScreenCapture;
pub use camera_stream::CameraStream;
pub use audio_stream::AudioStream;
pub use file_upload::FileUpload;

