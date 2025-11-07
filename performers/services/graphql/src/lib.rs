pub mod hume_client;
pub mod db;
pub mod models;
pub mod constants;
pub mod activities;
pub mod blob_storage;

use async_graphql::{EmptySubscription, EmptyMutation, Schema};
use async_graphql_warp::graphql;
use async_graphql::http::{GraphQLPlaygroundConfig, playground_source};
use std::convert::Infallible;
use warp::{Filter, Reply, Rejection};

pub type GraphQLSchema = Schema<EmptyMutation, EmptyMutation, EmptySubscription>;

// Extract route creation for testing (moved from main.rs)
pub fn create_routes(schema: GraphQLSchema) -> impl Filter<Extract = impl Reply, Error = Rejection> + Clone {
    let graphql_post = warp::path("graphql")
        .and(warp::post())
        .and(graphql(schema.clone()).and_then(
            |(schema, request): (
                GraphQLSchema,
                async_graphql::Request,
            )| async move {
                Ok::<_, Infallible>(warp::reply::json(&schema.execute(request).await))
            },
        ));

    let graphql_playground = warp::path("playground")
        .and(warp::get())
        .map(|| {
            warp::http::Response::builder()
                .header("content-type", "text/html")
                .body(playground_source(GraphQLPlaygroundConfig::new("/graphql")))
        });

    graphql_post.or(graphql_playground).with(
        warp::cors()
            .allow_any_origin()
            .allow_headers(vec!["content-type"])
            .allow_methods(vec!["GET", "POST"]),
    )
}
