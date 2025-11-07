use diesel::prelude::*;
use uuid::Uuid;
use anyhow::Result;
use crate::db::DbConnection;
use crate::db::schema::*;
use super::report::ValidationReport;

/// Validate data quality (outliers, missing values, data ranges)
pub fn validate_quality(
    conn: &mut DbConnection,
    participant_id: Uuid,
    report: &mut ValidationReport,
) -> Result<()> {
    // Check for negative reaction times
    let negative_reaction_times: i64 = participant_response_data::table
        .filter(participant_response_data::participant_id.eq(participant_id))
        .filter(participant_response_data::reaction_time_ms.is_not_null())
        .filter(participant_response_data::reaction_time_ms.lt(0))
        .count()
        .get_result(conn)?;
    
    if negative_reaction_times > 0 {
        report.add_error(
            "quality",
            "Negative reaction times found",
            Some(format!("Count: {}", negative_reaction_times)),
        );
    }
    
    // Check for unreasonably large reaction times (> 60 seconds)
    let large_reaction_times: i64 = participant_response_data::table
        .filter(participant_response_data::participant_id.eq(participant_id))
        .filter(participant_response_data::reaction_time_ms.is_not_null())
        .filter(participant_response_data::reaction_time_ms.gt(60000))
        .count()
        .get_result(conn)?;
    
    if large_reaction_times > 0 {
        report.add_warning(
            "quality",
            "Unusually large reaction times (>60s)",
            Some(format!("Count: {}", large_reaction_times)),
        );
    }
    
    // Check for negative emotion scores
    let negative_emotion_scores: i64 = emotion_data::table
        .inner_join(participant_response_data::table.on(
            emotion_data::participant_response_data_id.eq(participant_response_data::id)
        ))
        .filter(participant_response_data::participant_id.eq(participant_id))
        .filter(emotion_data::score.lt(0.0))
        .count()
        .get_result(conn)?;
    
    if negative_emotion_scores > 0 {
        report.add_error(
            "quality",
            "Negative emotion scores found",
            Some(format!("Count: {}", negative_emotion_scores)),
        );
    }
    
    // Check for emotion scores > 1.0
    let large_emotion_scores: i64 = emotion_data::table
        .inner_join(participant_response_data::table.on(
            emotion_data::participant_response_data_id.eq(participant_response_data::id)
        ))
        .filter(participant_response_data::participant_id.eq(participant_id))
        .filter(emotion_data::score.gt(1.0))
        .count()
        .get_result(conn)?;
    
    if large_emotion_scores > 0 {
        report.add_warning(
            "quality",
            "Emotion scores > 1.0 found",
            Some(format!("Count: {}", large_emotion_scores)),
        );
    }
    
    // Check timestamp ordering (sessions should start before they end)
    // Load sessions and check in Rust since diesel doesn't easily support this comparison
    use chrono::DateTime;
    use chrono::Utc;
    
    let sessions = participant_experiment_sessions::table
        .filter(participant_experiment_sessions::participant_id.eq(participant_id))
        .select((
            participant_experiment_sessions::start_time,
            participant_experiment_sessions::end_time,
        ))
        .load::<(Option<DateTime<Utc>>, Option<DateTime<Utc>>)>(conn)?;
    
    let invalid_timestamps = sessions
        .iter()
        .filter(|(start, end)| {
            if let (Some(start_time), Some(end_time)) = (start, end) {
                start_time > end_time
            } else {
                false
            }
        })
        .count() as i64;
    
    if invalid_timestamps > 0 {
        report.add_error(
            "quality",
            "Invalid timestamp ordering (start_time > end_time)",
            Some(format!("Count: {}", invalid_timestamps)),
        );
    }
    
    // Check for empty strings in required text fields
    let empty_stimulus_words: i64 = participant_response_data::table
        .filter(participant_response_data::participant_id.eq(participant_id))
        .filter(participant_response_data::stimulus_word.eq(""))
        .count()
        .get_result(conn)?;
    
    if empty_stimulus_words > 0 {
        report.add_warning(
            "quality",
            "Empty stimulus_word values",
            Some(format!("Count: {}", empty_stimulus_words)),
        );
    }
    
    Ok(())
}

