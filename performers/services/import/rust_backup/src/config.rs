// Merkle DAG: import.service.config
// Configuration management

use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub dataset_path: String,
}

impl Config {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Config {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/spirit_in_physics".to_string()),
            dataset_path: env::var("DATASET_PATH").unwrap_or_else(|_| "dataset/participants".to_string()),
        })
    }
}

