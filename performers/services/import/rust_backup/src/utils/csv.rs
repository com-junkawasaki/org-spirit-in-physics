// Merkle DAG: import.service.utils.csv
// CSV parsing utilities

use crate::error::ImportError;
use std::collections::HashMap;

pub fn parse_csv_file(content: &str) -> Result<Vec<HashMap<String, String>>, ImportError> {
    let mut reader = csv::Reader::from_reader(content.as_bytes());
    let headers = reader
        .headers()
        .map_err(|e| ImportError::Csv(format!("Failed to read CSV headers: {}", e)))?
        .iter()
        .map(|s| s.to_string())
        .collect::<Vec<_>>();

    let mut records = Vec::new();

    for result in reader.records() {
        let record = result.map_err(|e| ImportError::Csv(format!("Failed to parse CSV record: {}", e)))?;
        
        let mut map = HashMap::new();
        for (i, field) in record.iter().enumerate() {
            if i < headers.len() {
                map.insert(headers[i].clone(), field.to_string());
            }
        }
        records.push(map);
    }

    Ok(records)
}

pub fn parse_csv_line(line: &str) -> Vec<String> {
    let mut values = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;

    for (i, char) in line.chars().enumerate() {
        match char {
            '"' => {
                if in_quotes && i + 1 < line.len() && line.chars().nth(i + 1) == Some('"') {
                    // Escaped quote
                    current.push('"');
                    // Skip next character
                } else {
                    // Toggle quote state
                    in_quotes = !in_quotes;
                }
            }
            ',' if !in_quotes => {
                values.push(current.trim().to_string());
                current.clear();
            }
            _ => {
                current.push(char);
            }
        }
    }

    // Add last value
    values.push(current.trim().to_string());

    values
}

