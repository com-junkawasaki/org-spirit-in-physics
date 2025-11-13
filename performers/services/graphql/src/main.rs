// Merkle DAG: graphql.service.main
// GraphQL service entry point using async-graphql + Poem

mod schema;
mod types;
mod resolvers;
mod database;
mod storage;

use poem::{
    handler,
    http::Method,
    listener::TcpListener,
    middleware::Cors,
    web::{Data, Html, Json},
    EndpointExt, Route, Server,
};
use async_graphql::{
    http::{playground_source, GraphQLPlaygroundConfig},
    Schema,
};
use async_graphql_poem::GraphQL;
use tracing::info;

use database::PostgresPool;
use schema::create_schema;

#[handler]
async fn graphql_playground() -> Html<String> {
    Html(playground_source(GraphQLPlaygroundConfig::new("/graphql")))
}

#[handler]
async fn schema_handler(
    Data(schema): Data<&Schema<schema::Query, schema::Mutation, async_graphql::EmptySubscription>>,
) -> String {
    schema.sdl()
}

#[handler]
async fn health_check() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "service": "graphql-service"
    }))
}

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

    // Configure CORS
    // When credentials: 'include' is used, we must specify exact origins (not wildcard)
    let allowed_origins = vec![
        "http://localhost:25250",      // participant app
        "https://patient.spirit-in-physics.orb.local", // participant app via orb.local
        "http://localhost:3000",      // visualizer app
        "http://localhost:4321",      // research app
        "http://localhost:4322",      // demo app
        "https://demo.spirit-in-physics.orb.local", // demo app via orb.local
        "http://localhost:8080",      // fallback
        "http://127.0.0.1:25250",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:4321",
        "http://127.0.0.1:4322",
    ];
    
    let cors = Cors::new()
        .allow_origins(allowed_origins)
        .allow_methods(vec![Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(vec!["Content-Type", "Authorization"])
        .allow_credentials(true);

    // Build routes
    let app = Route::new()
        .at("/graphql", GraphQL::new(schema.clone()))
        .at("/graphql/playground", graphql_playground)
        .at("/graphql/schema", schema_handler)
        .at("/health", health_check)
        .data(schema)
        .with(cors);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 8081));
    info!("GraphQL service listening on 0.0.0.0:8081");
    info!("GraphQL Playground available at http://localhost:8081/graphql/playground");

    Server::new(TcpListener::bind(addr))
        .run(app)
        .await?;

    Ok(())
}
