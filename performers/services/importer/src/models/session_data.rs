use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionData {
    #[serde(rename = "participantId")]
    pub participant_id: String,
    pub events: Vec<Event>,
    #[serde(rename = "wordResponses", default)]
    pub word_responses: Vec<WordResponse>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub timestamp: i64, // milliseconds since epoch
    #[serde(rename = "type")]
    pub event_type: String,
    pub payload: EventPayload,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum EventPayload {
    ParticipantInitialized {
        participant_id: String,
    },
    RecordingStarted {
        session: Option<u32>,
    },
    SessionStarted {
        session: u32,
        number_of_words: Option<u32>,
    },
    WordDisplayed {
        word: String,
        key: String,
    },
    ResponseWindowOpened {
        word: String,
    },
    SpeechDetected {
        word: String,
        key: String,
    },
    ResponseWindowClosed {
        word: String,
    },
    SessionDataSaved,
    PreflightStarted,
    PreflightDevicesAcquired,
    Empty {},
}

impl Default for EventPayload {
    fn default() -> Self {
        EventPayload::Empty {}
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordResponse {
    pub word: String,
    pub response: Option<String>,
    pub timestamp: Option<i64>,
}

// Helper functions for event processing
impl Event {
    pub fn timestamp_as_datetime(&self) -> DateTime<Utc> {
        DateTime::from_timestamp_millis(self.timestamp)
            .unwrap_or_else(|| DateTime::from_timestamp(0, 0).unwrap())
            .with_timezone(&Utc)
    }
}

