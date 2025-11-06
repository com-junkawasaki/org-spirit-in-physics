use async_graphql::{
    Context, EmptyMutation, EmptySubscription, Object, Schema, SimpleObject,
    http::{GraphQLPlaygroundConfig, playground_source},
};
use async_graphql_warp::graphql;
use dotenvy::dotenv;
use std::sync::Arc;
use std::convert::Infallible;
use warp::{Filter, Reply};

mod db;

use db::{DbPool, establish_connection};

#[derive(SimpleObject)]
struct Participant {
    id: String,
    age: Option<i32>,
    gender: Option<String>,
    handedness: Option<String>,
    created_at: String,
    updated_at: String,
}

struct Query;

#[Object]
impl Query {
    async fn hello(&self) -> String {
        "Hello, GraphQL!".to_string()
    }

    async fn participants(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<Participant>> {
        let pool = ctx.data::<Arc<DbPool>>()?;
        let _conn = pool.get().map_err(|e| async_graphql::Error::new(e.to_string()))?;
        
        // For now, return empty vector until we set up diesel schema properly
        // This will be implemented after diesel schema generation
        Ok(vec![])
    }
}

type GraphQLSchema = Schema<Query, EmptyMutation, EmptySubscription>;

#[tokio::main]
async fn main() {
    dotenv().ok();

    let pool = Arc::new(establish_connection());
    let schema = Schema::build(Query, EmptyMutation, EmptySubscription)
        .data(pool.clone())
        .finish();

    let graphql_post = graphql(schema)
        .and_then(|(schema, request): (GraphQLSchema, async_graphql::Request)| async move {
            Ok::<_, Infallible>(warp::reply::json(&schema.execute(request).await))
        });

    let graphql_playground = warp::path::end().map(|| {
        warp::reply::html(playground_source(GraphQLPlaygroundConfig::new("/graphql")))
    });

    let routes = graphql_playground
        .or(warp::path("graphql").and(graphql_post));

    println!("GraphQL server running on http://localhost:8080");
    println!("GraphiQL playground available at http://localhost:8080");

    warp::serve(routes).run(([0, 0, 0, 0], 8080)).await;
}
