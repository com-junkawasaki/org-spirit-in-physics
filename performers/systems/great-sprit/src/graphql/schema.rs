//! GraphQL schema definition

use async_graphql::{Schema, EmptySubscription};
use crate::graphql::query::Query;
use crate::graphql::mutation::Mutation;
use crate::gpu::device::GpuDevice;
use crate::kg::terminus::TerminusClient;

/// Create GraphQL schema
pub fn create_schema(
    gpu_device: GpuDevice,
    kg_client: TerminusClient,
) -> Schema<Query, Mutation, EmptySubscription> {
    Schema::build(Query::default(), Mutation::default(), EmptySubscription)
        .data(gpu_device)
        .data(kg_client)
        .finish()
}

/// Start GraphQL server
pub async fn start_server(
    config: crate::config::Config,
    gpu_device: GpuDevice,
    kg_client: TerminusClient,
) -> anyhow::Result<()> {
    let schema = create_schema(gpu_device, kg_client);
    
    // Use async-graphql-warp for server
    let addr = ([0, 0, 0, 0], config.server_port);
    async_graphql_warp::graphql(schema)
        .and_then(|(schema, request): (_, async_graphql::Request)| async move {
            Ok::<_, std::convert::Infallible>(async_graphql_warp::Response::from(
                schema.execute(request).await,
            ))
        })
        .with(warp::cors().allow_any_origin())
        .recover(|err: warp::Rejection| async move {
            Ok::<_, std::convert::Infallible>(warp::reply::with_status(
                format!("Internal error: {:?}", err),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ))
        })
        .serve(addr)
        .await;

    Ok(())
}

