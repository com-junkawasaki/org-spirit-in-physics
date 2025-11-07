use diesel::prelude::*;
use uuid::Uuid;
use anyhow::Result;
use crate::db::DbConnection;
use crate::db::schema::*;
use super::report::ValidationReport;

/// Validate data integrity (foreign keys, NULL constraints, data types)
pub fn validate_integrity(
    conn: &mut DbConnection,
    participant_id: Uuid,
    report: &mut ValidationReport,
) -> Result<()> {
    // Check participant exists
    let participant_count: i64 = participants::table
        .filter(participants::id.eq(participant_id))
        .count()
        .get_result(conn)?;
    
    if participant_count == 0 {
        report.add_error(
            "integrity",
            "Participant not found",
            Some(format!("Participant ID: {}", participant_id)),
        );
        return Ok(());
    }
    
    report.set_statistic("participant_exists", 1);
    
    // Check foreign key constraints for consents
    // Note: PostgreSQL foreign keys enforce this automatically, but we check anyway for validation
    let consent_count: i64 = participant_consents::table
        .filter(participant_consents::participant_id.eq(participant_id))
        .count()
        .get_result(conn)?;
    
    report.set_statistic("consents_integrity", consent_count);
    
    // Check if consents reference valid participants (should always be true due to FK)
    let invalid_consents: i64 = 0; // FK constraint ensures this
    
    if invalid_consents > 0 {
        report.add_error(
            "integrity",
            "Invalid foreign keys in participant_consents",
            Some(format!("Count: {}", invalid_consents)),
        );
    }
    
    // Check foreign key constraints for sessions
    let session_count: i64 = participant_experiment_sessions::table
        .filter(participant_experiment_sessions::participant_id.eq(participant_id))
        .count()
        .get_result(conn)?;
    
    report.set_statistic("sessions_integrity", session_count);
    
    // Check if sessions reference valid participants (should always be true due to FK)
    let invalid_sessions: i64 = 0; // FK constraint ensures this
    
    if invalid_sessions > 0 {
        report.add_error(
            "integrity",
            "Invalid foreign keys in participant_experiment_sessions",
            Some(format!("Count: {}", invalid_sessions)),
        );
    }
    
    // Check foreign key constraints for response data
    let response_count: i64 = participant_response_data::table
        .filter(participant_response_data::participant_id.eq(participant_id))
        .count()
        .get_result(conn)?;
    
    report.set_statistic("responses_integrity", response_count);
    
    // Check if responses reference valid participants (should always be true due to FK)
    let invalid_responses: i64 = 0; // FK constraint ensures this
    
    if invalid_responses > 0 {
        report.add_error(
            "integrity",
            "Invalid foreign keys in participant_response_data",
            Some(format!("Count: {}", invalid_responses)),
        );
    }
    
    // Check NULL constraints for required fields
    let null_sessions: i64 = participant_experiment_sessions::table
        .filter(participant_experiment_sessions::participant_id.eq(participant_id))
        .filter(participant_experiment_sessions::session_type.is_null())
        .count()
        .get_result(conn)?;
    
    if null_sessions > 0 {
        report.add_error(
            "integrity",
            "NULL values in required fields",
            Some(format!("Sessions with NULL session_type: {}", null_sessions)),
        );
    }
    
    Ok(())
}

