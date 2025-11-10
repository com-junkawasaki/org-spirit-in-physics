// Merkle DAG: import.service.neo4j.transaction
// Transaction management utilities

use crate::neo4j::client::Neo4jClient;
use crate::error::ImportError;

pub async fn execute_in_transaction<F, T>(
    client: &mut Neo4jClient,
    f: F,
) -> Result<T, ImportError>
where
    F: FnOnce(&mut crate::neo4j::client::Transaction) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<T, ImportError>> + Send>>,
{
    let mut txn = client.start_transaction().await?;
    
    match f(&mut txn).await {
        Ok(result) => {
            txn.commit().await?;
            Ok(result)
        }
        Err(e) => {
            let _ = txn.rollback().await;
            Err(e)
        }
    }
}

