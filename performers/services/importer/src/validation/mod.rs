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

/// Run all validation checks for imported data
pub fn validate_imported_data(
    conn: &mut DbConnection,
    participant_id: Uuid,
) -> Result<ValidationReport> {
    let mut report = ValidationReport::new(participant_id);
    
    // Run integrity checks
    validate_integrity(conn, participant_id, &mut report)?;
    
    // Run completeness checks
    validate_completeness(conn, participant_id, &mut report)?;
    
    // Run quality checks
    validate_quality(conn, participant_id, &mut report)?;
    
    Ok(report)
}

