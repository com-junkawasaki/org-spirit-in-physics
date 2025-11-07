use importer::models::{SessionData, ConsentData, PhysiologicalRecord, PhysiologicalData};

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

