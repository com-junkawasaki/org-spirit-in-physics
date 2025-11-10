use diesel::prelude::*;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use anyhow::{Result, Context};
use serde_json::{json, Value as JsonValue};

use crate::db::{DbConnection, schema::{participant_experiment_sessions, participant_session_events, participant_response_data}};
use crate::db::schema::sql_types::SessionType;
use crate::parsers::SessionBoundary;
use crate::models::Event;

/// Import session and return session ID
/// If a session with the same participant_id, session_type, and start_time already exists, returns the existing session ID
pub fn import_session(
    conn: &mut DbConnection,
    participant_id: Uuid,
    boundary: &SessionBoundary,
) -> Result<Uuid> {
    use crate::db::schema::sql_types::SessionType;
    use diesel::dsl::sql;

    let start_time = DateTime::from_timestamp_millis(boundary.start_timestamp)
        .ok_or_else(|| anyhow::anyhow!("Invalid start timestamp"))?
        .with_timezone(&Utc);

    let end_time = boundary.end_timestamp.and_then(|ts| {
        DateTime::from_timestamp_millis(ts).map(|dt| dt.with_timezone(&Utc))
    });

    // Map session number to SessionType
    // Assuming session 1 = "practice", session 2 = "experiment" (adjust as needed)
    let session_type_str: &str = match boundary.session_number {
        1 => "practice",
        _ => "experiment",
    };

    // Check if session with same participant_id, session_type, and start_time already exists
    // Use a small time window (1 second) to account for potential timestamp differences
    let time_window = chrono::Duration::seconds(1);
    let start_time_min = start_time - time_window;
    let start_time_max = start_time + time_window;

    let existing_session: Option<Uuid> = participant_experiment_sessions::table
        .filter(participant_experiment_sessions::participant_id.eq(participant_id))
        .filter(participant_experiment_sessions::session_type.eq(sql::<SessionType>(&format!("'{}'::session_type", session_type_str))))
        .filter(participant_experiment_sessions::start_time.ge(start_time_min))
        .filter(participant_experiment_sessions::start_time.le(start_time_max))
        .select(participant_experiment_sessions::id)
        .first::<Uuid>(conn)
        .optional()
        .context("Failed to check for existing session")?;

    if let Some(existing_id) = existing_session {
        tracing::info!("Session {} already exists for participant {} (session_type: {}, start_time: {}), skipping import", 
                       existing_id, participant_id, session_type_str, start_time);
        return Ok(existing_id);
    }

    // Create new session
    let session_id = Uuid::new_v4();
    diesel::insert_into(participant_experiment_sessions::table)
        .values((
            participant_experiment_sessions::id.eq(session_id),
            participant_experiment_sessions::participant_id.eq(participant_id),
            participant_experiment_sessions::session_type.eq(sql::<SessionType>(&format!("'{}'::session_type", session_type_str))),
            participant_experiment_sessions::start_time.eq(start_time),
            participant_experiment_sessions::end_time.eq(end_time),
        ))
        .execute(conn)
        .context("Failed to insert session")?;

    Ok(session_id)
}

/// Delete all existing session data for a participant to prevent duplicates
/// This will delete sessions, responses, and all related data
pub fn delete_participant_sessions(
    conn: &mut DbConnection,
    participant_id: Uuid,
) -> Result<()> {
    use diesel::dsl::delete;
    
    // Delete response data first (may have foreign key constraints)
    let deleted_responses = delete(participant_response_data::table)
        .filter(participant_response_data::participant_id.eq(participant_id))
        .execute(conn)
        .context("Failed to delete existing response data")?;
    
    // Delete sessions (this will also delete session events via CASCADE)
    let deleted_sessions = delete(participant_experiment_sessions::table)
        .filter(participant_experiment_sessions::participant_id.eq(participant_id))
        .execute(conn)
        .context("Failed to delete existing sessions")?;
    
    tracing::info!("Deleted {} existing session(s) and {} response(s) for participant {}", 
                   deleted_sessions, deleted_responses, participant_id);
    
    Ok(())
}

/// Import session events
pub fn import_session_events(
    conn: &mut DbConnection,
    participant_id: Uuid,
    session_id: Uuid,
    events: &[Event],
) -> Result<()> {
    let mut event_records = Vec::new();

    for event in events {
        let timestamp = event.timestamp_as_datetime();
        let payload_json: JsonValue = json!(event.payload);

        event_records.push((
            participant_session_events::id.eq(Uuid::new_v4()),
            participant_session_events::participant_id.eq(participant_id),
            participant_session_events::session_id.eq(session_id),
            participant_session_events::event_type.eq(&event.event_type),
            participant_session_events::timestamp.eq(timestamp),
            participant_session_events::payload.eq(Some(payload_json)),
        ));
    }

    // Batch insert events (one by one for now, can be optimized later)
    for event_record in event_records {
        diesel::insert_into(participant_session_events::table)
            .values(event_record)
            .execute(conn)
            .context("Failed to insert session events")?;
    }

    Ok(())
}

