//! Image Processing Module
//!
//! 画像前処理・正規化を行うモジュール。
//! 感情分析モデルへの入力形式に変換する。

use anyhow::Result;
use image::{DynamicImage, ImageBuffer, Rgb, RgbImage};

/// Image processor for emotion analysis
///
/// 感情分析用の画像前処理を行う。
pub struct ImageProcessor {
    /// Target width for resizing
    target_width: u32,
    /// Target height for resizing
    target_height: u32,
}

impl ImageProcessor {
    /// Create new image processor
    pub fn new(target_width: u32, target_height: u32) -> Self {
        Self {
            target_width,
            target_height,
        }
    }

    /// Process image: resize and normalize
    ///
    /// 画像をリサイズし、正規化する。
    pub fn process(&self, image: &DynamicImage) -> Result<Vec<f32>> {
        // Resize image
        let resized = image.resize_exact(
            self.target_width,
            self.target_height,
            image::imageops::FilterType::Lanczos3,
        );

        // Convert to RGB
        let rgb_image: RgbImage = resized.to_rgb8();

        // Normalize to [0.0, 1.0] range
        let mut normalized = Vec::with_capacity(
            (self.target_width * self.target_height * 3) as usize
        );

        for pixel in rgb_image.pixels() {
            normalized.push(pixel[0] as f32 / 255.0);
            normalized.push(pixel[1] as f32 / 255.0);
            normalized.push(pixel[2] as f32 / 255.0);
        }

        Ok(normalized)
    }

    /// Process image from bytes
    pub fn process_from_bytes(&self, bytes: &[u8]) -> Result<Vec<f32>> {
        let image = image::load_from_memory(bytes)?;
        self.process(&image)
    }

    /// Extract face region from image (placeholder)
    ///
    /// 画像から顔領域を抽出する（プレースホルダー）。
    /// 実際の実装では顔検出モジュールと統合する。
    pub fn extract_face_region(&self, _image: &DynamicImage) -> Result<Option<DynamicImage>> {
        // TODO: Integrate with face detector
        Ok(None)
    }
}

impl Default for ImageProcessor {
    fn default() -> Self {
        // Default: 224x224 (common input size for emotion models)
        Self::new(224, 224)
    }
}

