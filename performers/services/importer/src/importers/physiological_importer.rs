use diesel::prelude::*;
use diesel::dsl::sql;
use diesel::sql_types::Numeric;
use uuid::Uuid;
use anyhow::{Result, Context};
use rust_decimal::Decimal;

use crate::db::{DbConnection, schema::physiological_data};
use crate::models::PhysiologicalRecord;

/// Import physiological data for a response
pub fn import_physiological_data(
    conn: &mut DbConnection,
    response_id: Uuid,
    records: &[PhysiologicalRecord],
    session_start_timestamp_ms: i64,
) -> Result<()> {
    for record in records {
        // Convert relative time (in seconds) to absolute timestamp (in milliseconds)
        // Physiological CSV timestamps are relative to session start, so add session_start_timestamp_ms
        let record_timestamp_ms = session_start_timestamp_ms + record.time_ms();

        // Use skin potential (average of Ch1 and Ch2)
        let skin_potential = record.skin_potential();
        let skin_potential_decimal = Decimal::from_f64_retain(skin_potential)
            .unwrap_or(Decimal::ZERO);

        // Insert into physiological_data table instead of response_skin_potential_timeseries
        let timestamp = chrono::DateTime::from_timestamp_millis(record_timestamp_ms)
            .ok_or_else(|| anyhow::anyhow!("Invalid timestamp"))?
            .with_timezone(&chrono::Utc);
        
        let physiological_id = Uuid::new_v4();
        diesel::insert_into(physiological_data::table)
            .values((
                physiological_data::id.eq(physiological_id),
                physiological_data::participant_response_data_id.eq(response_id),
                physiological_data::average.eq(Some(skin_potential)),
                physiological_data::max_value.eq(Some(skin_potential)),
                physiological_data::min_value.eq(Some(skin_potential)),
                physiological_data::timestamp.eq(timestamp),
            ))
            .execute(conn)
            .context("Failed to insert physiological data")?;
    }

    Ok(())
}

/// Map physiological records to a response based on timestamp
/// Note: Physiological CSV timestamps are relative to session start (in seconds)
/// This function converts them to absolute timestamps (in milliseconds) for comparison
pub fn find_physiological_records_for_response(
    records: &[PhysiologicalRecord],
    response_timestamp_ms: i64,
    session_start_timestamp_ms: i64,
    window_before_ms: i64,
    window_after_ms: i64,
) -> Vec<PhysiologicalRecord> {
    records
        .iter()
        .filter(|record| {
            // Convert relative time (in seconds) to absolute timestamp (in milliseconds)
            // Physiological CSV timestamps are relative to session start, so add session_start_timestamp_ms
            let record_timestamp_ms = session_start_timestamp_ms + record.time_ms();
            record_timestamp_ms >= (response_timestamp_ms - window_before_ms)
                && record_timestamp_ms <= (response_timestamp_ms + window_after_ms)
        })
        .cloned()
        .collect()
}

