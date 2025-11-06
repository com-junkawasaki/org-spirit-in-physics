use async_graphql::{
    EmptySubscription, Schema,
    http::{GraphQLPlaygroundConfig, playground_source},
};
use async_graphql_warp::graphql;
use dotenvy::dotenv;
use std::sync::Arc;
use std::convert::Infallible;
use warp::{Filter, Reply};

use diesel_async::{AsyncPgConnection, pooled_connection::deadpool::Pool};

use crate::activities::{Query, Mutation};

mod constants;
mod db;
mod hume_client;
mod models;
mod activities;

pub type GraphQLSchema = Schema<Query, Mutation, EmptySubscription>;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    let db_pool = db::establish_connection().await?;
    let pool_arc = Arc::new(db_pool);

    let schema = Schema::build(Query, Mutation, EmptySubscription)
        .data(pool_arc)
        .finish();

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

    let routes = graphql_post.or(graphql_playground).with(
        warp::cors()
            .allow_any_origin()
            .allow_headers(vec!["content-type"])
            .allow_methods(vec!["GET", "POST"]),
    );

    println!("GraphQL server running at http://localhost:8080/graphql");
    println!("Playground available at http://localhost:8080/playground");

    warp::serve(routes).run(([0, 0, 0, 0], 8080)).await;

    Ok(())
}