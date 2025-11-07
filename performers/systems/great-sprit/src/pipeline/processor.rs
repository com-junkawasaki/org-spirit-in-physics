//! Data Processor Module
//!
//! データ前処理・正規化モジュール。

use anyhow::Result;
use crate::emotion::{ImageProcessor, AudioProcessor};
use crate::pipeline::collector::CollectedData;

/// Processed data
///
/// 処理済みデータ。
#[derive(Debug, Clone)]
pub struct ProcessedData {
    pub processed_image: Option<Vec<f32>>,
    pub processed_audio: Option<Vec<f32>>,
    pub source: crate::pipeline::collector::DataSource,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Data processor
///
/// データ前処理・正規化を行う。
pub struct Processor {
    image_processor: ImageProcessor,
    audio_processor: AudioProcessor,
}

impl Processor {
    /// Create new processor
    pub fn new() -> Self {
        Self {
            image_processor: ImageProcessor::default(),
            audio_processor: AudioProcessor::default(),
        }
    }

    /// Process collected data
    ///
    /// 収集されたデータを処理する。
    pub async fn process(&self, data: CollectedData) -> Result<ProcessedData> {
        let processed_image = if let Some(image_data) = &data.image_data {
            Some(self.image_processor.process_from_bytes(image_data)?)
        } else {
            None
        };

        let processed_audio = if let Some(audio_data) = &data.audio_data {
            Some(self.audio_processor.process_from_bytes(audio_data)?)
        } else {
            None
        };

        Ok(ProcessedData {
            processed_image,
            processed_audio,
            source: data.source,
            timestamp: data.timestamp,
        })
    }
}

impl Default for Processor {
    fn default() -> Self {
        Self::new()
    }
}

