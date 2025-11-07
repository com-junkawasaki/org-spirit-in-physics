use std::path::Path;
use anyhow::{Result, Context};
use csv::ReaderBuilder;
use crate::models::{PhysiologicalData, PhysiologicalRecord};

/// Parse physiological CSV file (Mod-002 format)
pub fn parse_physiological_csv<P: AsRef<Path>>(path: P) -> Result<PhysiologicalData> {
    let mut reader = ReaderBuilder::new()
        .has_headers(true)
        .from_path(path.as_ref())
        .with_context(|| format!("Failed to open CSV file: {:?}", path.as_ref()))?;

    let mut records = Vec::new();
    
    // Skip header rows until we find "Measurement Record"
    let mut found_measurement_record = false;
    for result in reader.records() {
        let record = result.with_context(|| "Failed to read CSV record")?;
        
        // Check if this is the measurement record header
        if record.get(0).map(|s| s == "Measurement Record").unwrap_or(false) {
            found_measurement_record = true;
            continue;
        }
        
        if !found_measurement_record {
            continue;
        }
        
        // Skip the header row (Time_Sec,Ch1,Ch2,...)
        if record.get(0).map(|s| s == "Time_Sec").unwrap_or(false) {
            continue;
        }
        
        // Parse data row
        if let Some(time_str) = record.get(0) {
            if let Ok(time_sec) = time_str.parse::<f64>() {
                let ch1 = record.get(1).and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                let ch2 = record.get(2).and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                let ch3 = record.get(3).and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                let ch4 = record.get(4).and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                let ch5 = record.get(5).and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                let ch6 = record.get(6).and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                let ch7 = record.get(7).and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                let ch8 = record.get(8).and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                
                records.push(PhysiologicalRecord {
                    time_sec,
                    ch1,
                    ch2,
                    ch3,
                    ch4,
                    ch5,
                    ch6,
                    ch7,
                    ch8,
                });
            }
        }
    }
    
    Ok(PhysiologicalData { records })
}

/// Parse HumeAI CSV files (face, prosody, language, burst)
/// Returns a vector of records as HashMap for flexible field access
pub fn parse_hume_csv<P: AsRef<Path>>(path: P) -> Result<Vec<std::collections::HashMap<String, String>>> {
    let mut reader = ReaderBuilder::new()
        .has_headers(true)
        .from_path(path.as_ref())
        .with_context(|| format!("Failed to open HumeAI CSV file: {:?}", path.as_ref()))?;

    let headers = reader.headers()
        .with_context(|| "Failed to read CSV headers")?
        .iter()
        .map(|s| s.to_string())
        .collect::<Vec<_>>();

    let mut records = Vec::new();
    
    for result in reader.records() {
        let record = result.with_context(|| "Failed to read CSV record")?;
        let mut map = std::collections::HashMap::new();
        
        for (i, field) in record.iter().enumerate() {
            if i < headers.len() {
                map.insert(headers[i].clone(), field.to_string());
            }
        }
        
        records.push(map);
    }
    
    Ok(records)
}

/// Helper to parse time field from HumeAI CSV record
pub fn parse_time_from_record(record: &std::collections::HashMap<String, String>) -> Option<f64> {
    // Try different possible field names
    record.get("Time")
        .or_else(|| record.get("time"))
        .or_else(|| record.get("BeginTime"))
        .or_else(|| record.get("beginTime"))
        .and_then(|s| s.parse::<f64>().ok())
}

/// Helper to parse begin/end time from HumeAI CSV record
pub fn parse_time_range_from_record(record: &std::collections::HashMap<String, String>) -> Option<(f64, f64)> {
    let begin = record.get("BeginTime")
        .or_else(|| record.get("beginTime"))
        .and_then(|s| s.parse::<f64>().ok())?;
    
    let end = record.get("EndTime")
        .or_else(|| record.get("endTime"))
        .and_then(|s| s.parse::<f64>().ok())?;
    
    Some((begin, end))
}

