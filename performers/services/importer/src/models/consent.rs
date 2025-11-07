use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsentData {
    #[serde(rename = "participantId")]
    pub participant_id: String,
    pub signature: String,
    pub agreements: Agreements,
    #[serde(rename = "agreedAt")]
    pub agreed_at: String, // ISO 8601 datetime string
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agreements {
    pub understand: bool,
    pub voluntary: bool,
    pub withdraw: bool,
    pub recording: bool,
}

impl ConsentData {
    pub fn agreed_at_datetime(&self) -> Result<DateTime<Utc>, chrono::ParseError> {
        DateTime::parse_from_rfc3339(&self.agreed_at)
            .map(|dt| dt.with_timezone(&Utc))
            .or_else(|_| {
                // Try parsing as ISO 8601 without timezone
                DateTime::parse_from_str(&self.agreed_at, "%Y-%m-%dT%H:%M:%S%.fZ")
                    .map(|dt| dt.with_timezone(&Utc))
            })
    }
}

