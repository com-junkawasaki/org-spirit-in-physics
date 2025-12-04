// Merkle DAG: grpc.service.error
// Error conversion utilities for gRPC status codes

use tonic::{Code, Status};
use sqlx::Error as SqlxError;

pub fn from_sqlx_error(err: SqlxError) -> Status {
    match err {
        SqlxError::Database(db_err) => {
            // Check for common database errors
            if db_err.message().contains("duplicate key") {
                Status::already_exists(format!("Resource already exists: {}", db_err.message()))
            } else if db_err.message().contains("foreign key") {
                Status::failed_precondition(format!("Foreign key constraint violation: {}", db_err.message()))
            } else if db_err.message().contains("not null") {
                Status::invalid_argument(format!("Required field missing: {}", db_err.message()))
            } else {
                Status::internal(format!("Database error: {}", db_err.message()))
            }
        }
        SqlxError::RowNotFound => Status::not_found("Resource not found"),
        SqlxError::TypeNotFound { type_name } => {
            Status::internal(format!("Database type not found: {}", type_name))
        }
        SqlxError::ColumnIndexOutOfBounds { index, len } => {
            Status::internal(format!("Column index out of bounds: {} >= {}", index, len))
        }
        SqlxError::ColumnNotFound(column) => {
            Status::internal(format!("Column not found: {}", column))
        }
        SqlxError::ColumnDecode { index, source } => {
            Status::internal(format!("Failed to decode column at index {}: {}", index, source))
        }
        SqlxError::Decode(decode_err) => {
            Status::internal(format!("Decode error: {}", decode_err))
        }
        SqlxError::PoolClosed => Status::unavailable("Database connection pool is closed"),
        SqlxError::PoolTimedOut => Status::deadline_exceeded("Database connection pool timeout"),
        SqlxError::WorkerCrashed => Status::unavailable("Database worker crashed"),
        SqlxError::Migrate(migrate_err) => {
            Status::internal(format!("Migration error: {}", migrate_err))
        }
        _ => Status::internal(format!("Database error: {}", err))
    }
}

pub fn from_uuid_parse_error(err: uuid::Error) -> Status {
    Status::invalid_argument(format!("Invalid UUID: {}", err))
}

pub fn from_chrono_parse_error(err: chrono::ParseError) -> Status {
    Status::invalid_argument(format!("Invalid date format: {}", err))
}

pub fn from_json_error(err: serde_json::Error) -> Status {
    Status::invalid_argument(format!("Invalid JSON: {}", err))
}

