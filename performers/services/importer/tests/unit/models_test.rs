use importer::models::{SessionData, ConsentData, PhysiologicalRecord, PhysiologicalData, Event, EventPayload, WordResponse};

#[test]
fn test_session_data_model() {
    let session_data = SessionData {
        participant_id: "test-123".to_string(),
        events: vec![],
        word_responses: vec![],
    };
    
    assert_eq!(session_data.participant_id, "test-123");
    assert_eq!(session_data.events.len(), 0);
}

#[test]
fn test_session_data_with_events() {
    let events = vec![
        Event {
            timestamp: 1000,
            event_type: "session_started".to_string(),
            payload: EventPayload::SessionStarted {
                session: 1,
                number_of_words: Some(10),
            },
        },
    ];
    
    let session_data = SessionData {
        participant_id: "test-123".to_string(),
        events,
        word_responses: vec![],
    };
    
    assert_eq!(session_data.events.len(), 1);
    assert_eq!(session_data.events[0].timestamp, 1000);
}

#[test]
fn test_consent_data_model() {
    let consent = ConsentData {
        participant_id: "test-123".to_string(),
        signature: "Test User".to_string(),
        agreed_at: "2025-08-01T01:04:15.696Z".to_string(),
        agreements: importer::models::Agreements {
            understand: true,
            voluntary: true,
            withdraw: true,
            recording: true,
        },
    };
    
    assert_eq!(consent.participant_id, "test-123");
    assert!(consent.agreements.understand);
    
    // Test datetime parsing
    let datetime_result = consent.agreed_at_datetime();
    assert!(datetime_result.is_ok());
}

#[test]
fn test_consent_agreements_all_false() {
    let consent = ConsentData {
        participant_id: "test-123".to_string(),
        signature: "Test User".to_string(),
        agreed_at: "2025-08-01T01:04:15.696Z".to_string(),
        agreements: importer::models::Agreements {
            understand: false,
            voluntary: false,
            withdraw: false,
            recording: false,
        },
    };
    
    assert!(!consent.agreements.understand);
    assert!(!consent.agreements.voluntary);
}

#[test]
fn test_physiological_record_model() {
    let record = PhysiologicalRecord {
        time_sec: 1.5,
        ch1: 0.044,
        ch2: 0.004,
        ch3: 1.498,
        ch4: 1.728,
        ch5: 0.0,
        ch6: 0.0,
        ch7: 0.0,
        ch8: 0.0,
    };
    
    assert_eq!(record.time_ms(), 1500);
    assert_eq!(record.skin_potential(), (0.044 + 0.004) / 2.0);
    assert_eq!(record.channels().len(), 8);
}

#[test]
fn test_physiological_record_time_conversion() {
    let record = PhysiologicalRecord {
        time_sec: 0.0,
        ch1: 0.0,
        ch2: 0.0,
        ch3: 0.0,
        ch4: 0.0,
        ch5: 0.0,
        ch6: 0.0,
        ch7: 0.0,
        ch8: 0.0,
    };
    
    assert_eq!(record.time_ms(), 0);
    
    let record2 = PhysiologicalRecord {
        time_sec: 123.456,
        ch1: 0.0,
        ch2: 0.0,
        ch3: 0.0,
        ch4: 0.0,
        ch5: 0.0,
        ch6: 0.0,
        ch7: 0.0,
        ch8: 0.0,
    };
    
    assert_eq!(record2.time_ms(), 123456);
}

#[test]
fn test_physiological_record_skin_potential_calculation() {
    let record = PhysiologicalRecord {
        time_sec: 0.0,
        ch1: 1.0,
        ch2: 2.0,
        ch3: 0.0,
        ch4: 0.0,
        ch5: 0.0,
        ch6: 0.0,
        ch7: 0.0,
        ch8: 0.0,
    };
    
    assert_eq!(record.skin_potential(), 1.5); // (1.0 + 2.0) / 2.0
}

#[test]
fn test_physiological_data_model() {
    let data = PhysiologicalData {
        records: vec![
            PhysiologicalRecord {
                time_sec: 0.0,
                ch1: 0.044,
                ch2: 0.004,
                ch3: 1.498,
                ch4: 1.728,
                ch5: 0.0,
                ch6: 0.0,
                ch7: 0.0,
                ch8: 0.0,
            },
        ],
    };
    
    assert_eq!(data.records.len(), 1);
}

#[test]
fn test_physiological_data_empty() {
    let data = PhysiologicalData {
        records: vec![],
    };
    
    assert_eq!(data.records.len(), 0);
}

#[test]
fn test_word_response_model() {
    let word_response = WordResponse {
        word: "spirit".to_string(),
        response: Some("spirit".to_string()),
        timestamp: Some(1000),
    };
    
    assert_eq!(word_response.word, "spirit");
    assert_eq!(word_response.response, Some("spirit".to_string()));
    assert_eq!(word_response.timestamp, Some(1000));
}

#[test]
fn test_word_response_no_response() {
    let word_response = WordResponse {
        word: "spirit".to_string(),
        response: None,
        timestamp: None,
    };
    
    assert_eq!(word_response.word, "spirit");
    assert_eq!(word_response.response, None);
    assert_eq!(word_response.timestamp, None);
}

