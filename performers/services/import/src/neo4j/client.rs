// Merkle DAG: import.service.neo4j.client
// Neo4j client wrapper using neo4rs

use neo4rs::{Graph, Query, Row};
use std::sync::Arc;
use tracing::error;

use crate::config::Neo4jConfig;
use crate::error::ImportError;

pub struct Neo4jClient {
    graph: Arc<Graph>,
}

impl Neo4jClient {
    pub async fn new(config: &Neo4jConfig) -> Result<Self, ImportError> {
        let config_builder = neo4rs::ConfigBuilder::new()
            .uri(&config.uri)
            .user(&config.user)
            .password(&config.password)
            .db(&config.database);
        
        let graph_config = config_builder.build()
            .map_err(|e| ImportError::Database(format!("Failed to build Neo4j config: {}", e)))?;
        
        let graph = Graph::connect(graph_config)
            .await
            .map_err(|e| ImportError::Database(format!("Failed to connect to Neo4j: {}", e)))?;

        Ok(Neo4jClient {
            graph: Arc::new(graph),
        })
    }

    pub async fn execute_query(
        &self,
        query: &str,
        params: std::collections::HashMap<String, neo4rs::types::BoltType>,
    ) -> Result<Vec<Row>, ImportError> {
        let query_obj = Query::new(query).params(params);
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
        &self,
        query: &str,
        params: std::collections::HashMap<String, neo4rs::types::BoltType>,
    ) -> Result<Vec<Row>, ImportError> {
        let mut txn = self
            .graph
            .start_txn(Some(neo4rs::TxnConfig::default()))
            .await
            .map_err(|e| ImportError::Database(format!("Failed to start transaction: {}", e)))?;

        let query_obj = Query::new(query).params(params);
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

    pub async fn start_transaction(&self) -> Result<Transaction, ImportError> {
        let txn = self
            .graph
            .start_txn(Some(neo4rs::TxnConfig::default()))
            .await
            .map_err(|e| ImportError::Database(format!("Failed to start transaction: {}", e)))?;

        Ok(Transaction { txn })
    }

    pub fn graph(&self) -> &Arc<Graph> {
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
        params: std::collections::HashMap<String, neo4rs::types::BoltType>,
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

