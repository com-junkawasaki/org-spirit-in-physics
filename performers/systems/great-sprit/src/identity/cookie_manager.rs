//! Cookie Manager Module
//!
//! Cookieベースのセッション管理モジュール。

use anyhow::Result;
use uuid::Uuid;

/// Cookie manager
///
/// Cookieベースのセッション管理を行う。
pub struct CookieManager;

impl CookieManager {
    /// Create new cookie manager
    pub fn new() -> Self {
        Self
    }

    /// Get or create session ID from cookie
    ///
    /// CookieからセッションIDを取得または作成する。
    pub fn get_or_create_session_id(&self, cookie_value: Option<&str>) -> String {
        if let Some(cookie) = cookie_value {
            // Use existing cookie value
            cookie.to_string()
        } else {
            // Generate new session ID
            Uuid::new_v4().to_string()
        }
    }

    /// Validate session ID format
    ///
    /// セッションIDの形式を検証する。
    pub fn validate_session_id(&self, session_id: &str) -> bool {
        // Check if it's a valid UUID or custom format
        Uuid::parse_str(session_id).is_ok() || !session_id.is_empty()
    }

    /// Extract session ID from HTTP cookie header
    ///
    /// HTTP CookieヘッダーからセッションIDを抽出する。
    pub fn extract_from_header(&self, cookie_header: Option<&str>) -> Option<String> {
        cookie_header.and_then(|header| {
            // Parse "session_id=value" format
            header
                .split(';')
                .find_map(|part| {
                    let part = part.trim();
                    if part.starts_with("session_id=") {
                        Some(part[11..].to_string())
                    } else {
                        None
                    }
                })
        })
    }
}

impl Default for CookieManager {
    fn default() -> Self {
        Self::new()
    }
}

