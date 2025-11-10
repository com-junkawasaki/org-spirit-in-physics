// Merkle DAG: import.service.config
// Configuration management

use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub neo4j: Neo4jConfig,
    pub dataset_path: String,
}

#[derive(Debug, Clone)]
pub struct Neo4jConfig {
    pub uri: String,
    pub user: String,
    pub password: String,
    pub database: String,
}

impl Config {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Config {
            neo4j: Neo4jConfig {
                uri: env::var("NEO4J_URI").unwrap_or_else(|_| "neo4j://localhost:7687".to_string()),
                user: env::var("NEO4J_USER").unwrap_or_else(|_| "neo4j".to_string()),
                password: env::var("NEO4J_PASSWORD").unwrap_or_else(|_| "neo4jpassword".to_string()),
                database: env::var("NEO4J_DATABASE").unwrap_or_else(|_| "neo4j".to_string()),
            },
            dataset_path: env::var("DATASET_PATH").unwrap_or_else(|_| "dataset/participants".to_string()),
        })
    }
}

