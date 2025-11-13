// Merkle DAG: graphql.service.main
// GraphQL service entry point using async-graphql + Axum

mod schema;
mod types;
mod resolvers;
mod database;
mod storage;

use axum::{
    extract::State,
    http::{HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Router, Json,
};
use async_graphql::{
    http::{playground_source, GraphQLPlaygroundConfig},
};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse as AxumGraphQLResponse};
use tracing::info;

use database::PostgresPool;
use schema::create_schema;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    info!("Starting GraphQL service...");

    // Load database URL from environment
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/spirit_in_physics".to_string());

    // Initialize database pool
    let pool = PostgresPool::new(&database_url).await?;
    info!("PostgreSQL connection pool initialized");

    // Create GraphQL schema
    let schema = create_schema(pool.pool().clone()).await?;

    // GraphQL handler with CORS headers
    async fn graphql_handler(
        State(schema): State<async_graphql::Schema<schema::Query, schema::Mutation, async_graphql::EmptySubscription>>,
        req: GraphQLRequest,
    ) -> impl IntoResponse {
        let graphql_res: AxumGraphQLResponse = schema.execute(req.into_inner()).await.into();
        let mut res: Response = graphql_res.into_response();
        res.headers_mut().insert(
            axum::http::header::ACCESS_CONTROL_ALLOW_ORIGIN,
            HeaderValue::from_static("*"),
        );
        res.headers_mut().insert(
            axum::http::header::ACCESS_CONTROL_ALLOW_METHODS,
            HeaderValue::from_static("GET, POST, OPTIONS"),
        );
        res.headers_mut().insert(
            axum::http::header::ACCESS_CONTROL_ALLOW_HEADERS,
            HeaderValue::from_static("Content-Type, Authorization"),
        );
        res
    }

    // CORS preflight handler
    async fn cors_preflight() -> impl IntoResponse {
        (
            StatusCode::NO_CONTENT,
            [
                (axum::http::header::ACCESS_CONTROL_ALLOW_ORIGIN, "*"),
                (axum::http::header::ACCESS_CONTROL_ALLOW_METHODS, "GET, POST, OPTIONS"),
                (axum::http::header::ACCESS_CONTROL_ALLOW_HEADERS, "Content-Type, Authorization"),
            ],
        )
    }

    let app = Router::new()
        .route("/graphql", post(graphql_handler).options(cors_preflight))
        .route("/graphql/playground", get(graphql_playground))
        .route("/graphql/schema", get(schema_handler))
        .route("/health", get(health_check))
        .with_state(schema);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 8081));
    info!("GraphQL service listening on 0.0.0.0:8081");
    info!("GraphQL Playground available at http://localhost:8081/graphql/playground");

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await?;

    Ok(())
}


async fn graphql_playground() -> impl IntoResponse {
    Response::builder()
        .status(StatusCode::OK)
        .header("content-type", "text/html; charset=utf-8")
        .body(playground_source(GraphQLPlaygroundConfig::new("/graphql")))
        .unwrap()
}

async fn schema_handler(
    State(schema): State<async_graphql::Schema<schema::Query, schema::Mutation, async_graphql::EmptySubscription>>,
) -> impl IntoResponse {
    Response::builder()
        .status(StatusCode::OK)
        .header("content-type", "text/plain; charset=utf-8")
        .body(schema.sdl())
        .unwrap()
}

async fn health_check() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "service": "graphql-service"
    }))
}

