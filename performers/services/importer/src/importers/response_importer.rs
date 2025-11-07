use diesel::prelude::*;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use anyhow::{Result, Context};

use crate::db::{DbConnection, schema::{participant_response_data, word_stimuli}};
use crate::parsers::WordResponseSequence;

/// Get or create word stimulus and return its ID
pub fn get_or_create_word_stimulus(
    conn: &mut DbConnection,
    word: &str,
) -> Result<i32> {
    // Try to find existing word
    let existing: Option<i32> = word_stimuli::table
        .select(word_stimuli::id)
        .filter(word_stimuli::word.eq(word))
        .first::<i32>(conn)
        .optional()
        .context("Failed to query word_stimuli")?;

    if let Some(id) = existing {
        return Ok(id);
    }

    // Create new word stimulus
    let new_id: i32 = diesel::insert_into(word_stimuli::table)
        .values(word_stimuli::word.eq(word))
        .returning(word_stimuli::id)
        .get_result(conn)
        .context("Failed to insert word stimulus")?;

    Ok(new_id)
}

/// Import word response data
pub fn import_word_response(
    conn: &mut DbConnection,
    participant_id: Uuid,
    experiment_id: Uuid,
    session_id: Uuid,
    session_type: &str,
    response: &WordResponseSequence,
    session_start_timestamp: i64,
) -> Result<Uuid> {
    let word_stimulus_id = get_or_create_word_stimulus(conn, &response.stimulus_word)?;

    let response_id = Uuid::new_v4();
    let timestamp = DateTime::from_timestamp_millis(response.word_displayed_timestamp)
        .ok_or_else(|| anyhow::anyhow!("Invalid timestamp"))?
        .with_timezone(&Utc);

    let reaction_time_ms = response.reaction_time_ms.unwrap_or(0);

    // Map session type string to SessionType enum
    let session_type_str: &str = match session_type {
        "practice" => "practice",
        _ => "experiment",
    };

    // Use diesel::dsl::sql to cast string to SessionType
    use diesel::dsl::sql;
    use crate::db::schema::sql_types::SessionType;
    
    diesel::insert_into(participant_response_data::table)
        .values((
            participant_response_data::id.eq(response_id),
            participant_response_data::participant_id.eq(participant_id),
            participant_response_data::experiment_id.eq(experiment_id),
            participant_response_data::word_stimulus_id.eq(word_stimulus_id),
            participant_response_data::stimulus_word.eq(&response.stimulus_word),
            participant_response_data::response_word.eq(
                response.response_word.as_deref().unwrap_or("")
            ),
            participant_response_data::reaction_time_ms.eq(reaction_time_ms),
            participant_response_data::session.eq(Some(session_type_str.to_string())),
            participant_response_data::timestamp.eq(timestamp),
        ))
        .execute(conn)
        .context("Failed to insert word response")?;

    Ok(response_id)
}

/// Import multiple word responses in batch
pub fn import_word_responses_batch(
    conn: &mut DbConnection,
    participant_id: Uuid,
    experiment_id: Uuid,
    session_id: Uuid,
    session_type: &str,
    responses: &[WordResponseSequence],
    session_start_timestamp: i64,
) -> Result<Vec<Uuid>> {
    let mut response_ids = Vec::new();

    for response in responses {
        let response_id = import_word_response(
            conn,
            participant_id,
            experiment_id,
            session_id,
            session_type,
            response,
            session_start_timestamp,
        )?;
        response_ids.push(response_id);
    }

    Ok(response_ids)
}

