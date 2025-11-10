// Merkle DAG: import.service.neo4j.client
// Neo4j client wrapper using neo4rs

use neo4rs::{Graph, Query, Row, BoltString, BoltBoolean};
use futures::StreamExt;
use std::sync::Arc;
use tracing::error;

use crate::config::Neo4jConfig;
use crate::error::ImportError;

pub struct Neo4jClient {
    graph: Graph,
}

impl Neo4jClient {
    pub async fn new(config: &Neo4jConfig) -> Result<Self, ImportError> {
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
        
        let graph = Graph::connect(graph_config)
            .map_err(|e| ImportError::Database(format!("Failed to connect to Neo4j: {}", e)))?;

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
        while let Ok(Some(row)) = result.next().await {
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
        let query_obj = Query::new(query).params(params);
        let mut result = self
            .txn
            .execute(query_obj)
            .await
            .map_err(|e| ImportError::Database(format!("Query execution failed: {}", e)))?;

        let mut rows = Vec::new();
        while let Ok(Some(row)) = result.next().await {
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

