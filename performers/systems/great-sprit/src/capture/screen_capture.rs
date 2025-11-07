//! Screen Capture Module
//!
//! スクリーンショット取得モジュール。
//! WASM/ネイティブの両方に対応する。

use anyhow::Result;

/// Screen capture source type
///
/// スクリーンキャプチャのソースタイプ。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScreenSource {
    /// Full screen
    FullScreen,
    /// Specific window
    Window,
    /// Specific region
    Region,
}

/// Screen capture
///
/// スクリーンショットを取得する。
pub struct ScreenCapture {
    source: ScreenSource,
}

impl ScreenCapture {
    /// Create new screen capture
    pub fn new(source: ScreenSource) -> Self {
        Self { source }
    }

    /// Capture screen as image bytes
    ///
    /// スクリーンを画像バイトとして取得する。
    /// TODO: Implement actual screen capture
    /// - WASM: Use web-sys MediaDevices API or Canvas API
    /// - Native: Use platform-specific APIs (X11, Windows API, macOS APIs)
    pub async fn capture(&self) -> Result<Vec<u8>> {
        // TODO: Implement actual screen capture
        // For now, return empty vector
        Ok(Vec::new())
    }

    /// Capture screen region
    ///
    /// 指定領域をキャプチャする。
    pub async fn capture_region(
        &self,
        _x: u32,
        _y: u32,
        _width: u32,
        _height: u32,
    ) -> Result<Vec<u8>> {
        // TODO: Implement region capture
        Ok(Vec::new())
    }
}

impl Default for ScreenCapture {
    fn default() -> Self {
        Self::new(ScreenSource::FullScreen)
    }
}

