use std::path::Path;
use anyhow::{Result, Context};
use serde_json;
use crate::models::{SessionData, Event};

pub fn parse_session_data<P: AsRef<Path>>(path: P) -> Result<SessionData> {
    let content = std::fs::read_to_string(path.as_ref())
        .with_context(|| format!("Failed to read session_data.json from {:?}", path.as_ref()))?;
    
    let session_data: SessionData = serde_json::from_str(&content)
        .with_context(|| "Failed to parse session_data.json as JSON")?;
    
    Ok(session_data)
}

/// Extract session boundaries from events
#[derive(Debug, Clone)]
pub struct SessionBoundary {
    pub session_number: u32,
    pub start_timestamp: i64, // milliseconds
    pub end_timestamp: Option<i64>, // milliseconds
}

pub fn extract_session_boundaries(events: &[Event]) -> Vec<SessionBoundary> {
    let mut boundaries = Vec::new();
    let mut current_session: Option<SessionBoundary> = None;

    for event in events {
        match event.event_type.as_str() {
            "session_started" => {
                // Extract session number from payload
                if let Some(session_num) = extract_session_number(&event.payload) {
                    if let Some(prev_session) = current_session.take() {
                        boundaries.push(prev_session);
                    }
                    current_session = Some(SessionBoundary {
                        session_number: session_num,
                        start_timestamp: event.timestamp,
                        end_timestamp: None,
                    });
                }
            }
            "recording_ended" | "session_ended" => {
                if let Some(ref mut session) = current_session {
                    session.end_timestamp = Some(event.timestamp);
                }
            }
            _ => {}
        }
    }

    if let Some(session) = current_session {
        boundaries.push(session);
    }

    boundaries
}

fn extract_session_number(payload: &crate::models::EventPayload) -> Option<u32> {
    match payload {
        crate::models::EventPayload::SessionStarted { session, .. } => Some(*session),
        crate::models::EventPayload::RecordingStarted { session } => *session,
        _ => None,
    }
}

/// Extract word response sequences from events
#[derive(Debug, Clone)]
pub struct WordResponseSequence {
    pub stimulus_word: String,
    pub response_word: Option<String>,
    pub word_key: String,
    pub word_displayed_timestamp: i64,
    pub speech_detected_timestamp: Option<i64>,
    pub response_window_closed_timestamp: Option<i64>,
    pub reaction_time_ms: Option<i32>,
}

pub fn extract_word_responses(events: &[Event]) -> Vec<WordResponseSequence> {
    let mut responses = Vec::new();
    let mut pending_word: Option<(String, String, i64)> = None; // (word, key, timestamp)

    for event in events {
        match event.event_type.as_str() {
            "word_displayed" => {
                if let crate::models::EventPayload::WordDisplayed { word, key } = &event.payload {
                    pending_word = Some((word.clone(), key.clone(), event.timestamp));
                }
            }
            "speech_detected" => {
                if let Some((word, key, displayed_ts)) = pending_word.take() {
                    if let crate::models::EventPayload::SpeechDetected { word: detected_word, .. } = &event.payload {
                        let response = WordResponseSequence {
                            stimulus_word: word.clone(),
                            response_word: Some(detected_word.clone()),
                            word_key: key.clone(),
                            word_displayed_timestamp: displayed_ts,
                            speech_detected_timestamp: Some(event.timestamp),
                            response_window_closed_timestamp: None,
                            reaction_time_ms: Some((event.timestamp - displayed_ts) as i32),
                        };
                        pending_word = Some((word, key, displayed_ts));
                        responses.push(response);
                    } else {
                        pending_word = Some((word, key, displayed_ts));
                    }
                }
            }
            "response_window_closed" => {
                if let Some((word, key, displayed_ts)) = pending_word.take() {
                    let response = WordResponseSequence {
                        stimulus_word: word.clone(),
                        response_word: None,
                        word_key: key.clone(),
                        word_displayed_timestamp: displayed_ts,
                        speech_detected_timestamp: None,
                        response_window_closed_timestamp: Some(event.timestamp),
                        reaction_time_ms: Some((event.timestamp - displayed_ts) as i32),
                    };
                    
                    // Try to find matching speech_detected event
                    if let Some(last_response) = responses.last_mut() {
                        if last_response.stimulus_word == word && last_response.word_key == key {
                            last_response.response_window_closed_timestamp = Some(event.timestamp);
                            if let Some(speech_ts) = last_response.speech_detected_timestamp {
                                last_response.reaction_time_ms = Some((speech_ts - displayed_ts) as i32);
                            }
                            continue;
                        }
                    }
                    
                    responses.push(response);
                }
            }
            _ => {}
        }
    }

    responses
}

