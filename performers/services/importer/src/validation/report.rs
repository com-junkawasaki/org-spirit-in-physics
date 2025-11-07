use uuid::Uuid;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct ValidationReport {
    pub participant_id: Uuid,
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<ValidationWarning>,
    pub statistics: HashMap<String, i64>,
    pub passed: bool,
}

#[derive(Debug, Clone)]
pub struct ValidationError {
    pub category: String,
    pub message: String,
    pub details: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ValidationWarning {
    pub category: String,
    pub message: String,
    pub details: Option<String>,
}

impl ValidationReport {
    pub fn new(participant_id: Uuid) -> Self {
        Self {
            participant_id,
            errors: Vec::new(),
            warnings: Vec::new(),
            statistics: HashMap::new(),
            passed: true,
        }
    }
    
    pub fn add_error(&mut self, category: impl Into<String>, message: impl Into<String>, details: Option<String>) {
        self.errors.push(ValidationError {
            category: category.into(),
            message: message.into(),
            details,
        });
        self.passed = false;
    }
    
    pub fn add_warning(&mut self, category: impl Into<String>, message: impl Into<String>, details: Option<String>) {
        self.warnings.push(ValidationWarning {
            category: category.into(),
            message: message.into(),
            details,
        });
    }
    
    pub fn set_statistic(&mut self, key: impl Into<String>, value: i64) {
        self.statistics.insert(key.into(), value);
    }
    
    pub fn get_statistic(&self, key: &str) -> Option<i64> {
        self.statistics.get(key).copied()
    }
    
    pub fn summary(&self) -> String {
        let mut summary = format!(
            "Validation Report for Participant: {}\n",
            self.participant_id
        );
        summary.push_str(&format!("Status: {}\n", if self.passed { "PASSED" } else { "FAILED" }));
        summary.push_str(&format!("Errors: {}\n", self.errors.len()));
        summary.push_str(&format!("Warnings: {}\n", self.warnings.len()));
        summary.push_str("\nStatistics:\n");
        for (key, value) in &self.statistics {
            summary.push_str(&format!("  {}: {}\n", key, value));
        }
        if !self.errors.is_empty() {
            summary.push_str("\nErrors:\n");
            for error in &self.errors {
                summary.push_str(&format!("  [{}] {}\n", error.category, error.message));
                if let Some(ref details) = error.details {
                    summary.push_str(&format!("    Details: {}\n", details));
                }
            }
        }
        if !self.warnings.is_empty() {
            summary.push_str("\nWarnings:\n");
            for warning in &self.warnings {
                summary.push_str(&format!("  [{}] {}\n", warning.category, warning.message));
                if let Some(ref details) = warning.details {
                    summary.push_str(&format!("    Details: {}\n", details));
                }
            }
        }
        summary
    }
}

