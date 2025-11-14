// Merkle DAG: graphql.service.types.enums
// ENUM型の定義（sqlxでENUM型をRust enum型にマッピング）

use sqlx::Type;
use serde::{Deserialize, Serialize};

/// Emotion file type enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Type, Serialize, Deserialize)]
#[sqlx(type_name = "emotion_file_type", rename_all = "lowercase")]
pub enum EmotionFileType {
    Burst,
    Face,
    Language,
    Prosody,
}

/// Handedness type enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Type, Serialize, Deserialize)]
#[sqlx(type_name = "handedness_type", rename_all = "lowercase")]
pub enum HandednessType {
    Left,
    Right,
    Ambidextrous,
    Unknown,
}

/// Session event type enum
/// Domain first: アプリケーションコードから抽出したイベントタイプ
#[derive(Debug, Clone, Copy, PartialEq, Eq, Type, Serialize, Deserialize)]
#[sqlx(type_name = "session_event_type_enum", rename_all = "snake_case")]
pub enum SessionEventType {
    ParticipantInitialized,
    PreflightStarted,
    PreflightDevicesAcquired,
    RecordingStarted,
    RecordingStoppedAndSaved,
    SessionStarted,
    WordDisplayed,
    ResponseWindowOpened,
    SpeechDetected,
    ResponseWindowClosed,
    SessionDataSaved,
    Session1Completed,
    Session1VideoSaved,
    Session2Completed,
    TestCompleted,
    TestReset,
    MediaRecorderSetupFailed,
}

impl HandednessType {
    /// Convert to lowercase string for GraphQL
    pub fn to_string(&self) -> String {
        match self {
            HandednessType::Left => "left".to_string(),
            HandednessType::Right => "right".to_string(),
            HandednessType::Ambidextrous => "ambidextrous".to_string(),
            HandednessType::Unknown => "unknown".to_string(),
        }
    }
}

impl EmotionFileType {
    /// Convert to lowercase string for GraphQL
    pub fn to_string(&self) -> String {
        match self {
            EmotionFileType::Burst => "burst".to_string(),
            EmotionFileType::Face => "face".to_string(),
            EmotionFileType::Language => "language".to_string(),
            EmotionFileType::Prosody => "prosody".to_string(),
        }
    }
}

impl SessionEventType {
    /// Convert to snake_case string for GraphQL
    pub fn to_string(&self) -> String {
        match self {
            SessionEventType::ParticipantInitialized => "participant_initialized".to_string(),
            SessionEventType::PreflightStarted => "preflight_started".to_string(),
            SessionEventType::PreflightDevicesAcquired => "preflight_devices_acquired".to_string(),
            SessionEventType::RecordingStarted => "recording_started".to_string(),
            SessionEventType::RecordingStoppedAndSaved => "recording_stopped_and_saved".to_string(),
            SessionEventType::SessionStarted => "session_started".to_string(),
            SessionEventType::WordDisplayed => "word_displayed".to_string(),
            SessionEventType::ResponseWindowOpened => "response_window_opened".to_string(),
            SessionEventType::SpeechDetected => "speech_detected".to_string(),
            SessionEventType::ResponseWindowClosed => "response_window_closed".to_string(),
            SessionEventType::SessionDataSaved => "session_data_saved".to_string(),
            SessionEventType::Session1Completed => "session_1_completed".to_string(),
            SessionEventType::Session1VideoSaved => "session_1_video_saved".to_string(),
            SessionEventType::Session2Completed => "session_2_completed".to_string(),
            SessionEventType::TestCompleted => "test_completed".to_string(),
            SessionEventType::TestReset => "test_reset".to_string(),
            SessionEventType::MediaRecorderSetupFailed => "media_recorder_setup_failed".to_string(),
        }
    }
}
