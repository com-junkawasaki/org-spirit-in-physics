//! TerminusDB client

use anyhow::Result;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{info, warn, error};
use crate::config::Config;

/// TerminusDB client
#[derive(Clone)]
pub struct TerminusClient {
    client: Arc<Client>,
    base_url: String,
    db_name: String,
    api_key: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TerminusResponse {
    #[serde(flatten)]
    data: serde_json::Value,
}

impl TerminusClient {
    /// Initialize TerminusDB client
    pub async fn new(config: &Config) -> Result<Self> {
        info!("Initializing TerminusDB client...");
        eprintln!("[TerminusDB] Initializing client...");
        eprintln!("[TerminusDB] URL: {}", config.terminus_url);
        eprintln!("[TerminusDB] Database: {}", config.terminus_db);
        
        let client = Arc::new(Client::new());
        
        let client_instance = Self {
            client,
            base_url: config.terminus_url.clone(),
            db_name: config.terminus_db.clone(),
            api_key: config.terminus_api_key.clone(),
        };
        
        // Test connection
        info!("Testing TerminusDB connection...");
        eprintln!("[TerminusDB] Testing connection...");
        
        let test_url = format!("{}/api/status", client_instance.base_url);
        match client_instance.client.get(&test_url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    info!("TerminusDB connection successful");
                    eprintln!("[TerminusDB] Connection successful");
                } else {
                    warn!("TerminusDB returned status: {}", response.status());
                    eprintln!("[TerminusDB] WARNING: Status {}", response.status());
                }
            }
            Err(e) => {
                warn!("TerminusDB connection test failed: {:?}", e);
                eprintln!("[TerminusDB] WARNING: Connection test failed: {:?}", e);
                eprintln!("[TerminusDB] Continuing anyway (may be normal if DB is starting up)...");
            }
        }
        
        Ok(client_instance)
    }

    /// Query SPARQL
    pub async fn query_sparql(&self, query: &str) -> Result<serde_json::Value> {
        let url = format!("{}/api/query/{}", self.base_url, self.db_name);
        
        let mut request = self.client.post(&url).json(&serde_json::json!({
            "query": query
        }));

        if let Some(ref api_key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", api_key));
        }

        let response = request.send().await?;
        let json: serde_json::Value = response.json().await?;
        
        Ok(json)
    }

    /// Get document by ID
    pub async fn get_document(&self, doc_id: &str) -> Result<serde_json::Value> {
        let url = format!("{}/api/document/{}", self.base_url, self.db_name);
        
        let mut request = self.client.get(&url)
            .query(&[("id", doc_id)]);

        if let Some(ref api_key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", api_key));
        }

        let response = request.send().await?;
        let json: serde_json::Value = response.json().await?;
        
        Ok(json)
    }

    /// Query for embeddings
    pub async fn query_embeddings(&self, subject: &str) -> Result<Vec<f32>> {
        // SPARQL query to get embedding vector
        let query = format!(
            r#"
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX ex: <https://example.org/ontology#>
            SELECT ?embedding WHERE {{
                <{}> ex:embedding ?embedding .
            }}
            "#,
            subject
        );

        let result = self.query_sparql(&query).await?;
        
        // Parse embedding from result (simplified)
        // Actual implementation would parse SPARQL JSON result format
        Ok(vec![0.0; 128]) // Placeholder
    }
}

/// Initialize TerminusDB client (convenience function)
pub async fn init_terminus_client(config: &Config) -> Result<TerminusClient> {
    TerminusClient::new(config).await
}

