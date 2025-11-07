use diesel::prelude::*;
use diesel::sql_query;
use diesel::sql_types::BigInt;
use diesel::QueryableByName;
use uuid::Uuid;
use anyhow::Result;
use crate::db::DbConnection;
use crate::db::schema::*;
use super::report::ValidationReport;

/// Validate data completeness (expected record counts, session boundaries, event sequences)
pub fn validate_completeness(
    conn: &mut DbConnection,
    participant_id: Uuid,
    report: &mut ValidationReport,
) -> Result<()> {
    // Count participants
    let participant_count: i64 = participants::table
        .filter(participants::id.eq(participant_id))
        .count()
        .get_result(conn)?;
    
    report.set_statistic("participants", participant_count);
    
    if participant_count == 0 {
        report.add_error(
            "completeness",
            "No participant record found",
            None,
        );
        return Ok(());
    }
    
    // Count consents
    let consent_count: i64 = participant_consents::table
        .filter(participant_consents::participant_id.eq(participant_id))
        .count()
        .get_result(conn)?;
    
    report.set_statistic("consents", consent_count);
    
    // Count sessions
    let session_count: i64 = participant_experiment_sessions::table
        .filter(participant_experiment_sessions::participant_id.eq(participant_id))
        .count()
        .get_result(conn)?;
    
    report.set_statistic("sessions", session_count);
    
    if session_count == 0 {
        report.add_warning(
            "completeness",
            "No sessions found for participant",
            None,
        );
    }
    
    // Count session events
    let event_count: i64 = participant_session_events::table
        .filter(participant_session_events::participant_id.eq(participant_id))
        .count()
        .get_result(conn)?;
    
    report.set_statistic("session_events", event_count);
    
    // Count response data
    let response_count: i64 = participant_response_data::table
        .filter(participant_response_data::participant_id.eq(participant_id))
        .count()
        .get_result(conn)?;
    
    report.set_statistic("responses", response_count);
    
    // Count emotion data
    let emotion_count: i64 = emotion_data::table
        .inner_join(participant_response_data::table.on(
            emotion_data::participant_response_data_id.eq(participant_response_data::id)
        ))
        .filter(participant_response_data::participant_id.eq(participant_id))
        .count()
        .get_result(conn)?;
    
    report.set_statistic("emotion_data", emotion_count);
    
    // Count physiological data
    let physiological_count: i64 = physiological_data::table
        .inner_join(participant_response_data::table.on(
            physiological_data::participant_response_data_id.eq(participant_response_data::id)
        ))
        .filter(participant_response_data::participant_id.eq(participant_id))
        .count()
        .get_result(conn)?;
    
    report.set_statistic("physiological_data", physiological_count);
    
    // Count emotion timeseries (with timeout protection)
    // Note: Using raw SQL for complex joins with timeseries tables
    use diesel::sql_query;
    use diesel::sql_types::BigInt;
    use diesel::QueryableByName;
    
    #[derive(QueryableByName)]
    struct CountResult {
        #[diesel(sql_type = BigInt, column_name = "count")]
        count: i64,
    }
    
    // Use simpler query to avoid timeout
    let emotion_timeseries_result = sql_query(
        "SELECT COUNT(*) as count 
         FROM response_emotion_timeseries ret
         WHERE EXISTS (
             SELECT 1 FROM participant_response_data prd 
             WHERE prd.id = ret.response_id AND prd.participant_id = $1
         )"
    )
    .bind::<diesel::sql_types::Uuid, _>(participant_id)
    .load::<CountResult>(conn);
    
    let emotion_timeseries_count = emotion_timeseries_result
        .ok()
        .and_then(|v| v.first().map(|r| r.count))
        .unwrap_or(0);
    
    report.set_statistic("emotion_timeseries", emotion_timeseries_count);
    
    // Count skin potential timeseries (with timeout protection)
    let skin_potential_result = sql_query(
        "SELECT COUNT(*) as count 
         FROM response_skin_potential_timeseries rspt
         WHERE EXISTS (
             SELECT 1 FROM participant_response_data prd 
             WHERE prd.id = rspt.response_id AND prd.participant_id = $1
         )"
    )
    .bind::<diesel::sql_types::Uuid, _>(participant_id)
    .load::<CountResult>(conn);
    
    let skin_potential_count = skin_potential_result
        .ok()
        .and_then(|v| v.first().map(|r| r.count))
        .unwrap_or(0);
    
    report.set_statistic("skin_potential_timeseries", skin_potential_count);
    
    // Validate session boundaries
    let sessions_without_start: i64 = participant_experiment_sessions::table
        .filter(participant_experiment_sessions::participant_id.eq(participant_id))
        .filter(participant_experiment_sessions::start_time.is_null())
        .count()
        .get_result(conn)?;
    
    if sessions_without_start > 0 {
        report.add_warning(
            "completeness",
            "Sessions without start_time",
            Some(format!("Count: {}", sessions_without_start)),
        );
    }
    
    // Check if sessions have events
    #[derive(QueryableByName)]
    struct SessionCountResult {
        #[diesel(sql_type = BigInt, column_name = "count")]
        count: i64,
    }
    
    let sessions_with_events_result = diesel::sql_query(
        "SELECT COUNT(DISTINCT ses.id) as count
         FROM participant_experiment_sessions ses
         INNER JOIN participant_session_events evt ON evt.session_id = ses.id
         WHERE ses.participant_id = $1"
    )
    .bind::<diesel::sql_types::Uuid, _>(participant_id)
    .load::<SessionCountResult>(conn);
    
    let sessions_with_events = sessions_with_events_result
        .ok()
        .and_then(|v| v.first().map(|r| r.count))
        .unwrap_or(0);
    
    if sessions_with_events < session_count {
        report.add_warning(
            "completeness",
            "Some sessions have no events",
            Some(format!("Sessions with events: {}/{}", sessions_with_events, session_count)),
        );
    }
    
    Ok(())
}

