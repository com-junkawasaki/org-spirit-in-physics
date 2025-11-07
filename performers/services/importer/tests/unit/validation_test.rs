use importer::validation::ValidationReport;
use uuid::Uuid;

#[test]
fn test_validation_report_new() {
    let participant_id = Uuid::new_v4();
    let report = ValidationReport::new(participant_id);
    
    assert_eq!(report.participant_id, participant_id);
    assert_eq!(report.errors.len(), 0);
    assert_eq!(report.warnings.len(), 0);
    assert!(report.passed);
}

#[test]
fn test_validation_report_add_error() {
    let participant_id = Uuid::new_v4();
    let mut report = ValidationReport::new(participant_id);
    
    report.add_error("test_category", "Test error message", Some("Details".to_string()));
    
    assert_eq!(report.errors.len(), 1);
    assert!(!report.passed);
    assert_eq!(report.errors[0].category, "test_category");
    assert_eq!(report.errors[0].message, "Test error message");
    assert_eq!(report.errors[0].details, Some("Details".to_string()));
}

#[test]
fn test_validation_report_add_warning() {
    let participant_id = Uuid::new_v4();
    let mut report = ValidationReport::new(participant_id);
    
    report.add_warning("test_category", "Test warning message", None);
    
    assert_eq!(report.warnings.len(), 1);
    assert!(report.passed); // Warnings don't fail validation
    assert_eq!(report.warnings[0].category, "test_category");
    assert_eq!(report.warnings[0].message, "Test warning message");
}

#[test]
fn test_validation_report_statistics() {
    let participant_id = Uuid::new_v4();
    let mut report = ValidationReport::new(participant_id);
    
    report.set_statistic("test_count", 42);
    report.set_statistic("another_count", 100);
    
    assert_eq!(report.get_statistic("test_count"), Some(42));
    assert_eq!(report.get_statistic("another_count"), Some(100));
    assert_eq!(report.get_statistic("nonexistent"), None);
}

#[test]
fn test_validation_report_summary() {
    let participant_id = Uuid::new_v4();
    let mut report = ValidationReport::new(participant_id);
    
    report.add_error("integrity", "Test error", None);
    report.add_warning("quality", "Test warning", None);
    report.set_statistic("participants", 1);
    
    let summary = report.summary();
    assert!(summary.contains("Validation Report"));
    assert!(summary.contains(&participant_id.to_string()));
    assert!(summary.contains("FAILED"));
    assert!(summary.contains("Test error"));
    assert!(summary.contains("Test warning"));
    assert!(summary.contains("participants"));
}

#[test]
fn test_validation_report_passed_with_warnings() {
    let participant_id = Uuid::new_v4();
    let mut report = ValidationReport::new(participant_id);
    
    report.add_warning("quality", "Minor issue", None);
    
    assert!(report.passed); // Should still pass with only warnings
    assert_eq!(report.warnings.len(), 1);
    assert_eq!(report.errors.len(), 0);
}

#[test]
fn test_validation_report_failed_with_errors() {
    let participant_id = Uuid::new_v4();
    let mut report = ValidationReport::new(participant_id);
    
    report.add_error("integrity", "Critical error", None);
    
    assert!(!report.passed);
    assert_eq!(report.errors.len(), 1);
}

