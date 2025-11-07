pub mod hume_client;
pub mod db;
pub mod models;
pub mod constants;
pub mod activities;
pub mod blob_storage;

use async_graphql::{EmptySubscription, Schema};
use async_graphql_warp::graphql;
use async_graphql::http::{GraphQLPlaygroundConfig, playground_source};
use std::convert::Infallible;
use warp::{Filter, Reply, Rejection};
use activities::{Query, Mutation};

pub type GraphQLSchema = Schema<Query, Mutation, EmptySubscription>;

/// Build a GraphQL schema without database connection (for SDL generation)
pub fn build_schema_for_sdl() -> GraphQLSchema {
    Schema::build(Query::default(), Mutation::default(), EmptySubscription)
        .finish()
}

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

    // SDL endpoint for schema introspection
    let schema_clone = schema.clone();
    let graphql_sdl = warp::path("graphql")
        .and(warp::path("sdl"))
        .and(warp::get())
        .map(move || {
            let sdl = schema_clone.sdl();
            warp::http::Response::builder()
                .header("content-type", "text/plain; charset=utf-8")
                .body(sdl)
        });

    graphql_post
        .or(graphql_playground)
        .or(graphql_sdl)
        .with(
            warp::cors()
                .allow_any_origin()
                .allow_headers(vec!["content-type"])
                .allow_methods(vec!["GET", "POST"]),
        )
}
