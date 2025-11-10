// Merkle DAG: import.service.neo4j.client
// Neo4j client wrapper using neo4rs

use neo4rs::{Graph, Query, Row, BoltString, BoltBoolean};
use futures::StreamExt;
use std::sync::Arc;
use tracing::{error, info, warn};

use crate::config::Neo4jConfig;
use crate::error::ImportError;

pub struct Neo4jClient {
    graph: Graph,
}

impl Neo4jClient {
    pub async fn new(config: &Neo4jConfig) -> Result<Self, ImportError> {
        use tracing::{info, warn};
        
        info!("Initializing Neo4j client with URI: {}", config.uri);
        
        let mut config_builder = neo4rs::ConfigBuilder::new()
            .uri(&config.uri)
            .user(&config.user)
            .password(&config.password);
        
        // Set database if specified
        if !config.database.is_empty() && config.database != "neo4j" {
            config_builder = config_builder.db(neo4rs::Database::from(config.database.as_str()));
        }
        
        let graph_config = config_builder.build()
            .map_err(|e| ImportError::Database(format!("Failed to build Neo4j config: {}", e)))?;
        
        // Graph::connectは同期的に接続を確立しようとするが、実際の接続は非同期で行われる可能性がある
        // 接続を再試行するロジックを追加
        let mut graph = None;
        let mut last_error = None;
        
        for attempt in 1..=5 {
            // graph_configを再構築（Cloneが実装されていない可能性があるため）
            let mut retry_config_builder = neo4rs::ConfigBuilder::new()
                .uri(&config.uri)
                .user(&config.user)
                .password(&config.password);
            
            if !config.database.is_empty() && config.database != "neo4j" {
                retry_config_builder = retry_config_builder.db(neo4rs::Database::from(config.database.as_str()));
            }
            
            let retry_graph_config = match retry_config_builder.build() {
                Ok(cfg) => cfg,
                Err(e) => {
                    warn!("Failed to build Neo4j config on attempt {}: {:?}", attempt, e);
                    last_error = Some(format!("Config build error: {:?}", e));
                    if attempt < 5 {
                        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                    }
                    continue;
                }
            };
            
            match Graph::connect(retry_graph_config) {
                Ok(g) => {
                    info!("Successfully connected to Neo4j on attempt {}", attempt);
                    graph = Some(g);
                    break;
                }
                Err(e) => {
                    warn!("Failed to connect to Neo4j on attempt {}: {:?}", attempt, e);
                    last_error = Some(format!("Connection error: {:?}", e));
                    if attempt < 5 {
                        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                    }
                }
            }
        }
        
        let graph = graph.ok_or_else(|| {
            ImportError::Database(format!(
                "Failed to connect to Neo4j after 5 attempts. Last error: {}",
                last_error.unwrap_or_else(|| "Unknown error".to_string())
            ))
        })?;

        // 接続をテストするために簡単なクエリを実行
        let test_query = Query::new("RETURN 1 as test".to_string());
        match graph.execute(test_query).await {
            Ok(mut result) => {
                if let Ok(Some(_)) = result.next().await {
                    info!("Neo4j connection test successful");
                } else {
                    warn!("Neo4j connection test returned no results");
                }
            }
            Err(e) => {
                warn!("Neo4j connection test failed: {:?}", e);
                // 接続テストが失敗しても続行（実際のクエリで再試行される可能性がある）
            }
        }

        Ok(Neo4jClient {
            graph,
        })
    }

    pub async fn execute_query(
        &mut self,
        query: &str,
        params: std::collections::HashMap<String, neo4rs::BoltType>,
    ) -> Result<Vec<Row>, ImportError> {
        let query_obj = Query::new(query.to_string()).params(params);
        let mut result = self
            .graph
            .execute(query_obj)
            .await
            .map_err(|e| ImportError::Database(format!("Query execution failed: {}", e)))?;

        let mut rows = Vec::new();
        while let Ok(Some(row)) = result.next().await {
            rows.push(row);
        }

        Ok(rows)
    }

    pub async fn execute_write(
        &mut self,
        query: &str,
        params: std::collections::HashMap<String, neo4rs::BoltType>,
    ) -> Result<Vec<Row>, ImportError> {
        let mut txn = self
            .graph
            .start_txn()
            .await
            .map_err(|e| ImportError::Database(format!("Failed to start transaction: {}", e)))?;

        let query_obj = Query::new(query.to_string()).params(params);
        let mut result = txn
            .execute(query_obj)
            .await
            .map_err(|e| ImportError::Database(format!("Query execution failed: {}", e)))?;

        let mut rows = Vec::new();
        while let Ok(Some(row)) = result.next(&mut txn).await {
            rows.push(row);
        }

        txn.commit()
            .await
            .map_err(|e| ImportError::Database(format!("Transaction commit failed: {}", e)))?;

        Ok(rows)
    }

    pub async fn start_transaction(&mut self) -> Result<Transaction, ImportError> {
        let txn = self
            .graph
            .start_txn()
            .await
            .map_err(|e| ImportError::Database(format!("Failed to start transaction: {}", e)))?;

        Ok(Transaction { txn })
    }

    pub fn graph(&self) -> &Graph {
        &self.graph
    }
}

pub struct Transaction {
    txn: neo4rs::Txn,
}

impl Transaction {
    pub async fn execute(
        &mut self,
        query: &str,
        params: std::collections::HashMap<String, neo4rs::BoltType>,
    ) -> Result<Vec<Row>, ImportError> {
        let query_obj = Query::new(query.to_string()).params(params);
        let mut result = self
            .txn
            .execute(query_obj)
            .await
            .map_err(|e| ImportError::Database(format!("Query execution failed: {}", e)))?;

        let mut rows = Vec::new();
        while let Ok(Some(row)) = result.next(&mut self.txn).await {
            rows.push(row);
        }

        Ok(rows)
    }

    pub async fn commit(self) -> Result<(), ImportError> {
        self.txn
            .commit()
            .await
            .map_err(|e| ImportError::Database(format!("Transaction commit failed: {}", e)))?;
        Ok(())
    }

    pub async fn rollback(self) -> Result<(), ImportError> {
        self.txn
            .rollback()
            .await
            .map_err(|e| ImportError::Database(format!("Transaction rollback failed: {}", e)))?;
        Ok(())
    }
}

