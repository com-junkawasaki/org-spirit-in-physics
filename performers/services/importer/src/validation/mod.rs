pub mod integrity;
pub mod completeness;
pub mod quality;
pub mod report;

pub use report::ValidationReport;
pub use integrity::validate_integrity;
pub use completeness::validate_completeness;
pub use quality::validate_quality;

use crate::db::DbConnection;
use uuid::Uuid;
use anyhow::Result;
use std::time::Instant;

const VALIDATION_TIMEOUT_SECS: u64 = 60;

/// Run all validation checks for imported data with timeout protection
pub fn validate_imported_data(
    conn: &mut DbConnection,
    participant_id: Uuid,
) -> Result<ValidationReport> {
    let start_time = Instant::now();
    let mut report = ValidationReport::new(participant_id);
    
    // Run integrity checks with timeout check
    if start_time.elapsed().as_secs() > VALIDATION_TIMEOUT_SECS {
        report.add_error("timeout", "Validation timeout before integrity checks", None);
        return Ok(report);
    }
    if let Err(e) = validate_integrity(conn, participant_id, &mut report) {
        report.add_error("integrity", &format!("Integrity check failed: {}", e), None);
    }
    
    // Run completeness checks with timeout check
    if start_time.elapsed().as_secs() > VALIDATION_TIMEOUT_SECS {
        report.add_error("timeout", "Validation timeout before completeness checks", None);
        return Ok(report);
    }
    if let Err(e) = validate_completeness(conn, participant_id, &mut report) {
        report.add_error("completeness", &format!("Completeness check failed: {}", e), None);
    }
    
    // Run quality checks with timeout check
    if start_time.elapsed().as_secs() > VALIDATION_TIMEOUT_SECS {
        report.add_error("timeout", "Validation timeout before quality checks", None);
        return Ok(report);
    }
    if let Err(e) = validate_quality(conn, participant_id, &mut report) {
        report.add_error("quality", &format!("Quality check failed: {}", e), None);
    }
    
    let total_duration = start_time.elapsed();
    report.set_statistic("validation_duration_secs", total_duration.as_secs() as i64);
    
    if total_duration.as_secs() > VALIDATION_TIMEOUT_SECS {
        report.add_warning("timeout", "Validation took longer than expected", 
            Some(format!("Duration: {:?}", total_duration)));
    }
    
    Ok(report)
}

