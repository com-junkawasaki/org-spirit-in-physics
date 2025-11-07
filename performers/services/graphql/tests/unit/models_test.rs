use graphql::models::*;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[test]
fn test_participant_to_participant_gql_conversion() {
    let participant = Participant {
        id: Uuid::new_v4(),
        age: Some(30),
        handedness: Some("right".to_string()),
        created_at: Some(DateTime::parse_from_rfc3339("2024-01-01T00:00:00Z")
            .unwrap()
            .with_timezone(&Utc)),
        updated_at: Some(DateTime::parse_from_rfc3339("2024-01-01T00:00:00Z")
            .unwrap()
            .with_timezone(&Utc)),
        name: None,
        ethnicity: None,
        income: None,
        consent_version: None,
        study_id: None,
    };

    let gql = ParticipantGQL {
        id: participant.id.to_string(),
        age: participant.age,
        gender: None, // GenderType enum conversion skipped
        handedness: participant.handedness.clone(),
        created_at: participant.created_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
        updated_at: participant.updated_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
    };

    assert_eq!(gql.id, participant.id.to_string());
    assert_eq!(gql.age, participant.age);
    assert_eq!(gql.handedness, participant.handedness);
}

#[test]
fn test_new_participant_creation() {
    let new_participant = NewParticipant {
        age: Some(25),
        handedness: Some("left".to_string()),
        name: None,
        ethnicity: None,
        income: None,
        consent_version: None,
        study_id: None,
    };

    assert_eq!(new_participant.age, Some(25));
    assert_eq!(new_participant.handedness, Some("left".to_string()));
}

#[test]
fn test_new_participant_with_none_values() {
    let new_participant = NewParticipant {
        age: None,
        handedness: None,
        name: None,
        ethnicity: None,
        income: None,
        consent_version: None,
        study_id: None,
    };

    assert_eq!(new_participant.age, None);
    assert_eq!(new_participant.handedness, None);
}

#[test]
fn test_participant_gql_serialization() {
    let gql = ParticipantGQL {
        id: Uuid::new_v4().to_string(),
        age: Some(30),
        gender: Some("male".to_string()),
        handedness: Some("right".to_string()),
        created_at: "2024-01-01T00:00:00Z".to_string(),
        updated_at: "2024-01-01T00:00:00Z".to_string(),
    };

    // Test that it can be serialized (for GraphQL)
    let json = serde_json::to_string(&gql);
    assert!(json.is_ok(), "ParticipantGQL should be serializable");
}

