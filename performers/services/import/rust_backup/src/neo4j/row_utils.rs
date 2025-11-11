// Merkle DAG: import.service.neo4j.row_utils
// Utility functions for extracting values from neo4rs::Row

use neo4rs::{Row, BoltType};
use crate::error::ImportError;

/// Extract a String value from a Row by field name
pub fn get_string(row: &Row, field_name: &str) -> Result<String, ImportError> {
    // neo4rs 0.9.0-rc.8では、Row::get()メソッドはResult<BoltType, DeError>を返す
    let bolt_value = row.get(field_name)
        .map_err(|e| ImportError::Database(format!("Failed to get field '{}': {:?}", field_name, e)))?;
    
    match bolt_value {
        BoltType::String(s) => Ok(s.to_string()),
        BoltType::Null(_) => Err(ImportError::Database(format!("Field '{}' is null", field_name))),
        _ => Err(ImportError::Database(format!("Field '{}' is not a string", field_name))),
    }
}

/// Extract an optional String value from a Row by field name
pub fn get_string_opt(row: &Row, field_name: &str) -> Result<Option<String>, ImportError> {
    match row.get(field_name) {
        Ok(BoltType::String(s)) => Ok(Some(s.to_string())),
        Ok(BoltType::Null(_)) => Ok(None),
        Ok(_) => Err(ImportError::Database(format!("Field '{}' is not a string", field_name))),
        Err(_) => Ok(None), // Field not found
    }
}

/// Extract an i64 value from a Row by field name
pub fn get_i64(row: &Row, field_name: &str) -> Result<i64, ImportError> {
    let bolt_value = row.get(field_name)
        .map_err(|e| ImportError::Database(format!("Failed to get field '{}': {:?}", field_name, e)))?;
    
    match bolt_value {
        BoltType::Integer(i) => Ok(i.value as i64),
        BoltType::Null(_) => Err(ImportError::Database(format!("Field '{}' is null", field_name))),
        _ => Err(ImportError::Database(format!("Field '{}' is not an integer", field_name))),
    }
}

/// Extract an optional i64 value from a Row by field name
pub fn get_i64_opt(row: &Row, field_name: &str) -> Result<Option<i64>, ImportError> {
    match row.get(field_name) {
        Ok(BoltType::Integer(i)) => Ok(Some(i.value as i64)),
        Ok(BoltType::Null(_)) => Ok(None),
        Ok(_) => Err(ImportError::Database(format!("Field '{}' is not an integer", field_name))),
        Err(_) => Ok(None), // Field not found
    }
}

