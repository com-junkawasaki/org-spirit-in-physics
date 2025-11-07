use diesel::prelude::*;
use diesel::dsl::sql;
use diesel::sql_types::Numeric;
use uuid::Uuid;
use anyhow::{Result, Context};
use rust_decimal::Decimal;

use crate::db::{DbConnection, schema::response_skin_potential_timeseries};
use crate::models::PhysiologicalRecord;

/// Import physiological data for a response
pub fn import_physiological_data(
    conn: &mut DbConnection,
    response_id: Uuid,
    records: &[PhysiologicalRecord],
    session_start_timestamp_ms: i64,
) -> Result<()> {
    for record in records {
        // Calculate timestamp offset from session start (in milliseconds)
        let record_timestamp_ms = record.time_ms();
        let offset_ms = (record_timestamp_ms - session_start_timestamp_ms) as i32;

        // Use skin potential (average of Ch1 and Ch2)
        let skin_potential = record.skin_potential();
        let skin_potential_decimal = Decimal::from_f64_retain(skin_potential)
            .unwrap_or(Decimal::ZERO);

        // Use raw SQL to insert Decimal value as Numeric
        diesel::insert_into(response_skin_potential_timeseries::table)
            .values((
                response_skin_potential_timeseries::response_id.eq(response_id),
                response_skin_potential_timeseries::timestamp_offset_ms.eq(offset_ms),
                response_skin_potential_timeseries::value.eq(sql::<Numeric>(&format!("{}", skin_potential_decimal))),
            ))
            .execute(conn)
            .context("Failed to insert physiological data")?;
    }

    Ok(())
}

/// Map physiological records to a response based on timestamp
pub fn find_physiological_records_for_response(
    records: &[PhysiologicalRecord],
    response_timestamp_ms: i64,
    window_before_ms: i64,
    window_after_ms: i64,
) -> Vec<PhysiologicalRecord> {
    records
        .iter()
        .filter(|record| {
            let record_timestamp_ms = record.time_ms();
            record_timestamp_ms >= (response_timestamp_ms - window_before_ms)
                && record_timestamp_ms <= (response_timestamp_ms + window_after_ms)
        })
        .cloned()
        .collect()
}

