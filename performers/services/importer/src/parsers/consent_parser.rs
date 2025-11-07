use std::path::Path;
use anyhow::{Result, Context};
use serde_json;
use crate::models::ConsentData;

pub fn parse_consent<P: AsRef<Path>>(path: P) -> Result<ConsentData> {
    let content = std::fs::read_to_string(path.as_ref())
        .with_context(|| format!("Failed to read consent.json from {:?}", path.as_ref()))?;
    
    let consent: ConsentData = serde_json::from_str(&content)
        .with_context(|| "Failed to parse consent.json as JSON")?;
    
    Ok(consent)
}

