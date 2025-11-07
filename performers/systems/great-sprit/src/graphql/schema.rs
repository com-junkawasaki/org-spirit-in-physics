//! GraphQL schema definition

use async_graphql::Schema;
use crate::graphql::query::Query;
use crate::graphql::mutation::Mutation;
use crate::graphql::subscription::Subscription;
use crate::gpu::device::GpuDevice;
use crate::kg::terminus::TerminusClient;
use warp::Filter;
use std::path::PathBuf;

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
    
    // Add GraphQL Playground route (GET /graphql)
    let playground = warp::path("graphql")
        .and(warp::get())
        .map(|| {
            warp::reply::html(include_str!("../../resources/graphql-playground.html"))
        });
    
    // Add 3D Viewer route (GET /3d) - Three.js version
    let viewer_3d = warp::path("3d")
        .and(warp::get())
        .map(|| {
            warp::reply::html(include_str!("../../resources/3d-viewer.html"))
        });
    
    // Add Bevy Viewer route (GET /bevy)
    let viewer_bevy = warp::path("bevy")
        .and(warp::get())
        .map(|| {
            warp::reply::html(include_str!("../../resources/bevy-viewer.html"))
        });
    
    // Serve WebAssembly files (GET /wasm/*)
    let wasm_files = warp::path("wasm")
        .and(warp::path::tail())
        .and(warp::get())
        .and_then(|tail: warp::path::Tail| async move {
            let file_path = format!("resources/wasm/{}", tail.as_str());
            let path = PathBuf::from(&file_path);
            
            // Security: prevent directory traversal
            if path.components().any(|c| matches!(c, std::path::Component::ParentDir)) {
                return Err(warp::reject::not_found());
            }
            
            // Determine MIME type
            let mime = if path.extension().and_then(|s| s.to_str()) == Some("wasm") {
                "application/wasm"
            } else if path.extension().and_then(|s| s.to_str()) == Some("js") {
                "application/javascript"
            } else if path.extension().and_then(|s| s.to_str()) == Some("ts") {
                "application/typescript"
            } else {
                "application/octet-stream"
            };
            
            match tokio::fs::read(&path).await {
                Ok(content) => {
                    Ok(warp::reply::with_header(
                        warp::reply::with_header(
                            warp::reply::Response::new(content.into()),
                            "content-type",
                            mime,
                        ),
                        "cache-control",
                        "public, max-age=3600",
                    ))
                }
                Err(_) => Err(warp::reject::not_found()),
            }
        });
    
    // Route order: specific paths first, then GraphQL filter
    // This ensures /bevy, /3d, /wasm/* and /graphql (GET) are matched before GraphQL POST requests
    let routes = playground
        .or(viewer_bevy)
        .or(viewer_3d)
        .or(wasm_files)
        .or(graphql_filter)
        .with(cors)
        .recover(|err: warp::Rejection| async move {
            Ok::<_, std::convert::Infallible>(warp::reply::with_status(
                format!("Internal error: {:?}", err),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ))
        });
    
    use std::io::Write;
    eprintln!("Starting GraphQL server on {:?}", addr);
    std::io::stderr().flush().ok();
    println!("Starting GraphQL server on {:?}", addr);
    std::io::stdout().flush().ok();
    tracing::info!("Starting GraphQL server on {:?}", addr);
    
    eprintln!("GraphQL server is running and ready to accept connections");
    std::io::stderr().flush().ok();
    
    warp::serve(routes).run(addr).await;

    eprintln!("GraphQL server stopped");
    std::io::stderr().flush().ok();
    Ok(())
}

