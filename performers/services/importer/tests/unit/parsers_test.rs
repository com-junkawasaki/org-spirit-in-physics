use std::path::PathBuf;
use importer::parsers::{parse_session_data, parse_consent, parse_physiological_csv, parse_hume_csv, extract_session_boundaries, extract_word_responses};
use importer::models::Event;

#[test]
fn test_parse_session_data_valid() {
    // Create a temporary test file
    let test_data = r#"{
        "participantId": "test-participant-123",
        "events": [
            {
                "timestamp": 1754010116036,
                "type": "session_started",
                "payload": {
                    "session": 1,
                    "numberOfWords": 10
                }
            },
            {
                "timestamp": 1754010117000,
                "type": "word_displayed",
                "payload": {
                    "word": "spirit",
                    "key": "s"
                }
            }
        ],
        "wordResponses": []
    }"#;
    
    let temp_dir = std::env::temp_dir();
    let test_file = temp_dir.join("test_session_data.json");
    std::fs::write(&test_file, test_data).unwrap();
    
    let result = parse_session_data(&test_file);
    assert!(result.is_ok(), "Should parse valid session_data.json");
    
    let session_data = result.unwrap();
    assert_eq!(session_data.participant_id, "test-participant-123");
    assert_eq!(session_data.events.len(), 2);
    
    // Cleanup
    std::fs::remove_file(&test_file).ok();
}

#[test]
fn test_parse_consent_valid() {
    let test_data = r#"{
        "participantId": "test-participant-123",
        "signature": "Test User",
        "agreedAt": "2025-08-01T01:04:15.696Z",
        "agreements": {
            "understand": true,
            "voluntary": true,
            "withdraw": true,
            "recording": true
        }
    }"#;
    
    let temp_dir = std::env::temp_dir();
    let test_file = temp_dir.join("test_consent.json");
    std::fs::write(&test_file, test_data).unwrap();
    
    let result = parse_consent(&test_file);
    assert!(result.is_ok(), "Should parse valid consent.json");
    
    let consent = result.unwrap();
    assert_eq!(consent.participant_id, "test-participant-123");
    assert_eq!(consent.signature, "Test User");
    assert!(consent.agreements.understand);
    
    // Cleanup
    std::fs::remove_file(&test_file).ok();
}

#[test]
fn test_parse_physiological_csv_valid() {
    let test_data = r#"Filetype,Mod-002
Title,
Name,
Date,2025-08-01
Begin,10:2:1
End,10:32:2
Time Range, 0:30:1
Comment,

Measurement Record
Time_Sec,Ch1,Ch2,Ch3,Ch4,Ch5,Ch6,Ch7,Ch8
0,0.044,0.004,1.498,1.728,0.000,0.000,0.000,0.000
1,0.048,0.012,1.498,1.726,0.000,0.000,0.000,0.000
2,0.052,0.010,1.496,1.726,0.000,0.000,0.000,0.000
"#;
    
    let temp_dir = std::env::temp_dir();
    let test_file = temp_dir.join("test_physiological.CSV");
    std::fs::write(&test_file, test_data).unwrap();
    
    let result = parse_physiological_csv(&test_file);
    assert!(result.is_ok(), "Should parse valid physiological CSV");
    
    let data = result.unwrap();
    assert_eq!(data.records.len(), 3);
    assert_eq!(data.records[0].time_sec, 0.0);
    assert_eq!(data.records[0].ch1, 0.044);
    
    // Cleanup
    std::fs::remove_file(&test_file).ok();
}

#[test]
fn test_parse_hume_csv_valid() {
    // Use flexible CSV format - header has 43 fields, data row should match
    let test_data = "Time,BeginTime,EndTime,admiration,amusement,anger,annoyance,approval,calmness,concentration,confusion,contempt,contentment,desire,determination,disappointment,disapproval,disgust,distress,ecstasy,elation,embarrassment,empathic_pain,entrancement,envy,excitement,fear,gratitude,happiness,interest,joy,love,nostalgia,pride,realization,relief,romance,sadness,satisfaction,shame,surprise,sympathy,triumph\n0.0,0.0,1.0,0.1,0.2,0.0,0.0,0.3,0.4,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0";
    
    let temp_dir = std::env::temp_dir();
    let test_file = temp_dir.join("test_hume.csv");
    std::fs::write(&test_file, test_data).unwrap();
    
    let result = parse_hume_csv(&test_file);
    if let Err(e) = &result {
        eprintln!("Parse error: {}", e);
    }
    assert!(result.is_ok(), "Should parse valid Hume CSV. Error: {:?}", result.err());
    
    let records = result.unwrap();
    assert!(records.len() > 0, "Should have at least one record");
    assert!(records[0].contains_key("Time") || records[0].contains_key("time"));
    assert!(records[0].contains_key("admiration") || records[0].contains_key("Admiration"));
    
    // Cleanup
    std::fs::remove_file(&test_file).ok();
}

#[test]
fn test_extract_session_boundaries() {
    use importer::models::{Event, EventPayload};
    
    let events = vec![
        Event {
            timestamp: 1000,
            event_type: "session_started".to_string(),
            payload: EventPayload::SessionStarted {
                session: 1,
                number_of_words: Some(10),
            },
        },
        Event {
            timestamp: 2000,
            event_type: "word_displayed".to_string(),
            payload: EventPayload::WordDisplayed {
                word: "test".to_string(),
                key: "t".to_string(),
            },
        },
        Event {
            timestamp: 5000,
            event_type: "session_ended".to_string(),
            payload: EventPayload::Empty {},
        },
    ];
    
    let boundaries = extract_session_boundaries(&events);
    assert_eq!(boundaries.len(), 1);
    assert_eq!(boundaries[0].session_number, 1);
    assert_eq!(boundaries[0].start_timestamp, 1000);
    assert_eq!(boundaries[0].end_timestamp, Some(5000));
}

#[test]
fn test_extract_word_responses() {
    use importer::models::{Event, EventPayload};
    
    let events = vec![
        Event {
            timestamp: 1000,
            event_type: "word_displayed".to_string(),
            payload: EventPayload::WordDisplayed {
                word: "spirit".to_string(),
                key: "s".to_string(),
            },
        },
        Event {
            timestamp: 1500,
            event_type: "speech_detected".to_string(),
            payload: EventPayload::SpeechDetected {
                word: "spirit".to_string(),
                key: "s".to_string(),
            },
        },
        Event {
            timestamp: 2000,
            event_type: "response_window_closed".to_string(),
            payload: EventPayload::ResponseWindowClosed {
                word: "spirit".to_string(),
            },
        },
    ];
    
    let responses = extract_word_responses(&events);
    assert_eq!(responses.len(), 1);
    assert_eq!(responses[0].stimulus_word, "spirit");
    assert_eq!(responses[0].response_word, Some("spirit".to_string()));
    assert_eq!(responses[0].reaction_time_ms, Some(500));
}

#[test]
fn test_parse_session_data_invalid_json() {
    let temp_dir = std::env::temp_dir();
    let test_file = temp_dir.join("test_invalid.json");
    std::fs::write(&test_file, "{ invalid json }").unwrap();
    
    let result = parse_session_data(&test_file);
    assert!(result.is_err(), "Should fail to parse invalid JSON");
    
    // Cleanup
    std::fs::remove_file(&test_file).ok();
}

#[test]
fn test_parse_physiological_csv_empty() {
    let test_data = r#"Filetype,Mod-002
Title,
Name,
Date,2025-08-01
Measurement Record
Time_Sec,Ch1,Ch2,Ch3,Ch4,Ch5,Ch6,Ch7,Ch8
"#;
    
    let temp_dir = std::env::temp_dir();
    let test_file = temp_dir.join("test_empty_physiological.CSV");
    std::fs::write(&test_file, test_data).unwrap();
    
    let result = parse_physiological_csv(&test_file);
    assert!(result.is_ok(), "Should handle empty CSV gracefully");
    
    let data = result.unwrap();
    assert_eq!(data.records.len(), 0);
    
    // Cleanup
    std::fs::remove_file(&test_file).ok();
}

#[test]
fn test_parse_hume_csv_empty() {
    let test_data = "Time,BeginTime,EndTime,admiration\n";
    
    let temp_dir = std::env::temp_dir();
    let test_file = temp_dir.join("test_empty_hume.csv");
    std::fs::write(&test_file, test_data).unwrap();
    
    let result = parse_hume_csv(&test_file);
    assert!(result.is_ok(), "Should handle empty Hume CSV gracefully");
    
    let records = result.unwrap();
    assert_eq!(records.len(), 0);
    
    // Cleanup
    std::fs::remove_file(&test_file).ok();
}

