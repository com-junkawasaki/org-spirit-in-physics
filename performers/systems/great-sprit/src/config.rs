//! Configuration management

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// GraphQL server port
    pub server_port: u16,
    
    /// TerminusDB connection URL
    pub terminus_url: String,
    
    /// TerminusDB database name
    pub terminus_db: String,
    
    /// TerminusDB API key
    pub terminus_api_key: Option<String>,
    
    /// Number of agents (N)
    pub num_agents: usize,
    
    /// Number of particles per agent (P)
    pub particles_per_agent: usize,
    
    /// Time step (Δt)
    pub time_step: f32,
    
    /// Number of resonance bands (K)
    pub num_bands: usize,
    
    /// Workgroup size for GPU compute
    pub workgroup_size: u32,
}

impl Config {
    pub fn load() -> anyhow::Result<Self> {
        // Try to load from config file, then environment variables, then defaults
        let config_path = PathBuf::from("config.toml");
        
        if config_path.exists() {
            let content = std::fs::read_to_string(&config_path)?;
            let config: Config = toml::from_str(&content)?;
            return Ok(config);
        }
        
        // Default configuration
        Ok(Config {
            server_port: std::env::var("SERVER_PORT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(8080),
            terminus_url: std::env::var("TERMINUS_URL")
                .unwrap_or_else(|_| "http://localhost:6363".to_string()),
            terminus_db: std::env::var("TERMINUS_DB")
                .unwrap_or_else(|_| "spirit_kg".to_string()),
            terminus_api_key: std::env::var("TERMINUS_API_KEY").ok(),
            num_agents: std::env::var("NUM_AGENTS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(1000),
            particles_per_agent: std::env::var("PARTICLES_PER_AGENT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(10000),
            time_step: std::env::var("TIME_STEP")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.01),
            num_bands: std::env::var("NUM_BANDS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(8),
            workgroup_size: std::env::var("WORKGROUP_SIZE")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(256),
        })
    }
    
    /// Total number of samples (N × P)
    pub fn total_samples(&self) -> usize {
        self.num_agents * self.particles_per_agent
    }
}

