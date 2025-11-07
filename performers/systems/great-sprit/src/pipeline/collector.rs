//! Data Collector Module
//!
//! マルチモーダルデータ収集モジュール。

use anyhow::Result;
use crate::capture::{ScreenCapture, CameraStream, AudioStream, FileUpload};

/// Data collector
///
/// マルチモーダルデータを収集する。
pub struct Collector {
    screen_capture: ScreenCapture,
    camera_stream: Option<CameraStream>,
    audio_stream: Option<AudioStream>,
    file_upload: FileUpload,
}

/// Collected data
///
/// 収集されたデータ。
#[derive(Debug, Clone)]
pub struct CollectedData {
    pub image_data: Option<Vec<u8>>,
    pub audio_data: Option<Vec<u8>>,
    pub source: DataSource,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Data source
///
/// データソース。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DataSource {
    Screen,
    Camera,
    Microphone,
    File,
}

impl Collector {
    /// Create new collector
    pub fn new() -> Self {
        Self {
            screen_capture: ScreenCapture::default(),
            camera_stream: None,
            audio_stream: None,
            file_upload: FileUpload::default(),
        }
    }

    /// Collect data from screen
    ///
    /// スクリーンからデータを収集する。
    pub async fn collect_from_screen(&self) -> Result<CollectedData> {
        let image_data = self.screen_capture.capture().await?;
        Ok(CollectedData {
            image_data: Some(image_data),
            audio_data: None,
            source: DataSource::Screen,
            timestamp: chrono::Utc::now(),
        })
    }

    /// Collect data from camera and microphone
    ///
    /// カメラとマイクからデータを収集する。
    pub async fn collect_from_camera_mic(&mut self) -> Result<CollectedData> {
        // Initialize streams if needed
        if self.camera_stream.is_none() {
            let mut stream = CameraStream::default();
            stream.start().await?;
            self.camera_stream = Some(stream);
        }
        if self.audio_stream.is_none() {
            let mut stream = AudioStream::default();
            stream.start().await?;
            self.audio_stream = Some(stream);
        }

        // Capture frame and audio
        let image_data = if let Some(stream) = self.camera_stream.as_ref() {
            stream.capture_frame().await.ok()
        } else {
            None
        };
        // Note: Audio stream returns f32 samples, but CollectedData expects Vec<u8>
        // For now, convert f32 samples to bytes (simple conversion)
        let audio_data = if let Some(stream) = self.audio_stream.as_ref() {
            stream.capture_samples(1000).await.ok().map(|samples| {
                // Convert f32 samples to bytes (simple approach)
                samples.iter().flat_map(|&s| s.to_le_bytes()).collect()
            })
        } else {
            None
        };

        Ok(CollectedData {
            image_data,
            audio_data,
            source: DataSource::Camera,
            timestamp: chrono::Utc::now(),
        })
    }

    /// Collect data from uploaded file
    ///
    /// アップロードされたファイルからデータを収集する。
    pub async fn collect_from_file(&self, file_data: &[u8]) -> Result<CollectedData> {
        let file_type = self.file_upload.detect_file_type(file_data);
        
        match file_type {
            crate::capture::file_upload::FileType::Image => {
                let image_data = self.file_upload.process_image(file_data).await?;
                Ok(CollectedData {
                    image_data: Some(image_data),
                    audio_data: None,
                    source: DataSource::File,
                    timestamp: chrono::Utc::now(),
                })
            }
            crate::capture::file_upload::FileType::Audio => {
                let audio_data = self.file_upload.process_audio(file_data).await?;
                Ok(CollectedData {
                    image_data: None,
                    audio_data: Some(audio_data),
                    source: DataSource::File,
                    timestamp: chrono::Utc::now(),
                })
            }
            crate::capture::file_upload::FileType::Video => {
                let (image_frames, audio_data) = self.file_upload.process_video(file_data).await?;
                // Use first frame for now
                Ok(CollectedData {
                    image_data: image_frames.first().cloned(),
                    audio_data: Some(audio_data),
                    source: DataSource::File,
                    timestamp: chrono::Utc::now(),
                })
            }
            _ => anyhow::bail!("Unknown file type"),
        }
    }
}

impl Default for Collector {
    fn default() -> Self {
        Self::new()
    }
}

