//! GraphQL schema definition

use async_graphql::Schema;
use crate::graphql::query::Query;
use crate::graphql::mutation::Mutation;
use crate::graphql::subscription::Subscription;
use crate::gpu::device::GpuDevice;
use crate::kg::terminus::TerminusClient;
use warp::Filter;

/// Create GraphQL schema
pub fn create_schema(
    gpu_device: GpuDevice,
    kg_client: TerminusClient,
) -> Schema<Query, Mutation, Subscription> {
    Schema::build(Query::default(), Mutation::default(), Subscription::default())
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
    let graphql_filter = async_graphql_warp::graphql(schema)
        .and_then(|(schema, request): (Schema<Query, Mutation, Subscription>, async_graphql::Request)| async move {
            let response: async_graphql::Response = schema.execute(request).await;
            Ok::<_, std::convert::Infallible>(warp::reply::json(&response))
        });
    
    let cors = warp::cors()
        .allow_any_origin()
        .allow_headers(vec!["content-type"])
        .allow_methods(vec!["GET", "POST", "OPTIONS"]);
    
    let routes = graphql_filter
        .with(cors)
        .recover(|err: warp::Rejection| async move {
            Ok::<_, std::convert::Infallible>(warp::reply::with_status(
                format!("Internal error: {:?}", err),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ))
        });
    
    warp::serve(routes).run(addr).await;

    Ok(())
}

