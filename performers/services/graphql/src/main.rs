use async_graphql::{EmptySubscription, Schema};
use dotenvy::dotenv;
use std::sync::Arc;

mod constants;
mod db;
mod hume_client;
mod models;
mod activities;

// Use create_routes from lib.rs
use graphql::create_routes;
use activities::{Query, Mutation};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    let db_pool = db::establish_connection().await?;
    let pool_arc = Arc::new(db_pool);

    let schema = Schema::build(Query::default(), Mutation::default(), EmptySubscription)
        .data(pool_arc)
        .finish();

    let routes = create_routes(schema);

    println!("GraphQL server running at http://localhost:8080/graphql");
    println!("Playground available at http://localhost:8080/playground");

    warp::serve(routes).run(([0, 0, 0, 0], 8080)).await;

    Ok(())
}