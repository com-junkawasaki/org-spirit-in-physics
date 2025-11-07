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
    // Use a HashMap to track responses by (word, key) pair
    // This allows us to update responses as we encounter more events
    let mut response_map: std::collections::HashMap<(String, String), usize> = std::collections::HashMap::new();
    let mut pending_word: Option<(String, String, i64)> = None; // (word, key, timestamp)

    for event in events {
        match event.event_type.as_str() {
            "word_displayed" => {
                if let crate::models::EventPayload::WordDisplayed { word, key } = &event.payload {
                    // Create a new response entry for this word
                    let response = WordResponseSequence {
                        stimulus_word: word.clone(),
                        response_word: None,
                        word_key: key.clone(),
                        word_displayed_timestamp: event.timestamp,
                        speech_detected_timestamp: None,
                        response_window_closed_timestamp: None,
                        reaction_time_ms: None,
                    };
                    let index = responses.len();
                    response_map.insert((word.clone(), key.clone()), index);
                    responses.push(response);
                    pending_word = Some((word.clone(), key.clone(), event.timestamp));
                }
            }
            "speech_detected" => {
                if let crate::models::EventPayload::SpeechDetected { word: detected_word, key } = &event.payload {
                    // Find or create response for this word
                    let key = key.clone();
                    let word = detected_word.clone();
                    let response_index = response_map.get(&(word.clone(), key.clone()));
                    
                    if let Some(&index) = response_index {
                        // Update existing response
                        if let Some(response) = responses.get_mut(index) {
                            response.response_word = Some(detected_word.clone());
                            response.speech_detected_timestamp = Some(event.timestamp);
                            if response.word_displayed_timestamp > 0 {
                                response.reaction_time_ms = Some((event.timestamp - response.word_displayed_timestamp) as i32);
                            }
                        }
                    } else if let Some((pending_word_str, pending_key, displayed_ts)) = &pending_word {
                        // Check if this matches the pending word
                        if pending_word_str == &word && pending_key == &key {
                            // Create a new response
                            let response = WordResponseSequence {
                                stimulus_word: word.clone(),
                                response_word: Some(detected_word.clone()),
                                word_key: key.clone(),
                                word_displayed_timestamp: *displayed_ts,
                                speech_detected_timestamp: Some(event.timestamp),
                                response_window_closed_timestamp: None,
                                reaction_time_ms: Some((event.timestamp - displayed_ts) as i32),
                            };
                            let index = responses.len();
                            response_map.insert((word.clone(), key.clone()), index);
                            responses.push(response);
                        }
                    }
                }
            }
            "response_window_closed" => {
                if let crate::models::EventPayload::ResponseWindowClosed { word } = &event.payload {
                    // Find response for this word by matching the most recent pending word or by searching
                    let word = word.clone();
                    
                    // Try to find matching response using pending_word (most recent word_displayed)
                    let mut found = false;
                    if let Some((pending_word_str, pending_key, _displayed_ts)) = &pending_word {
                        if pending_word_str == &word {
                            // Try to find response with matching word and key
                            if let Some(&index) = response_map.get(&(word.clone(), pending_key.clone())) {
                                if let Some(response) = responses.get_mut(index) {
                                    response.response_window_closed_timestamp = Some(event.timestamp);
                                    if response.reaction_time_ms.is_none() && response.word_displayed_timestamp > 0 {
                                        response.reaction_time_ms = Some((event.timestamp - response.word_displayed_timestamp) as i32);
                                    }
                                    found = true;
                                }
                            }
                        }
                    }
                    
                    // If not found, search backwards for the most recent matching response without window_closed
                    if !found {
                        for response in responses.iter_mut().rev() {
                            if response.stimulus_word == word && response.response_window_closed_timestamp.is_none() {
                                response.response_window_closed_timestamp = Some(event.timestamp);
                                if response.reaction_time_ms.is_none() && response.word_displayed_timestamp > 0 {
                                    response.reaction_time_ms = Some((event.timestamp - response.word_displayed_timestamp) as i32);
                                }
                                found = true;
                                break;
                            }
                        }
                    }
                    
                    // If still not found, it means word_displayed was not processed yet (shouldn't happen normally)
                    // But we don't create a response here because word_displayed should come first
                }
            }
            _ => {}
        }
    }

    // Filter out responses that don't have at least word_displayed timestamp
    responses.into_iter()
        .filter(|r| r.word_displayed_timestamp > 0)
        .collect()
}

