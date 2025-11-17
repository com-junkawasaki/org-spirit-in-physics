// Merkle DAG: graphql.service.lib
// Library module for GraphQL service
// This allows api/*.rs files to import modules from src/

pub mod schema;
pub mod types;
pub mod resolvers;
pub mod database;
pub mod storage;

pub use database::PostgresPool;
pub use schema::{create_schema, Query, Mutation};

// Re-export get_allowed_origins from main.rs logic
pub fn get_allowed_origins() -> Vec<String> {
    let mut origins = vec![
        "http://localhost:25250".to_string(),
        "https://participant.spirit-in-physics.orb.local".to_string(),
        "http://localhost:3000".to_string(),
        "http://localhost:4321".to_string(),
        "http://localhost:4322".to_string(),
        "https://demo.spirit-in-physics.orb.local".to_string(),
        "http://localhost:8080".to_string(),
        "http://127.0.0.1:25250".to_string(),
        "http://127.0.0.1:3000".to_string(),
        "http://127.0.0.1:4321".to_string(),
        "http://127.0.0.1:4322".to_string(),
    ];

    if let Ok(vercel_url) = std::env::var("VERCEL_URL") {
        origins.push(format!("https://{}", vercel_url));
    }
    if let Ok(vercel_deployment_url) = std::env::var("VERCEL_DEPLOYMENT_URL") {
        origins.push(format!("https://{}", vercel_deployment_url));
    }
    if let Ok(next_public_app_url) = std::env::var("NEXT_PUBLIC_APP_URL") {
        origins.push(next_public_app_url);
    }

    if let Ok(custom_origins) = std::env::var("ALLOWED_ORIGINS") {
        for origin in custom_origins.split(',') {
            let trimmed = origin.trim().to_string();
            if !trimmed.is_empty() {
                origins.push(trimmed);
            }
        }
    }

    origins
}

