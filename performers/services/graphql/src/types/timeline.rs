// Merkle DAG: graphql.service.types.timeline
// Timeline type definitions

use async_graphql::*;

#[derive(SimpleObject, Debug, Clone)]
pub struct PhysiologicalData {
    pub timestamp: Option<String>,
    pub value: Option<f64>,
    pub metadata: Option<serde_json::Value>,
}
