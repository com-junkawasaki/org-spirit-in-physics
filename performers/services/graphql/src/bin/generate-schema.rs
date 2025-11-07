// Script to generate GraphQL schema SDL file
// Run with: cargo run --bin generate-schema

use graphql::build_schema_for_sdl;
use std::fs;
use std::path::Path;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Build schema (without database connection for SDL generation)
    let schema = build_schema_for_sdl();

    // Generate SDL
    let sdl = schema.sdl();

    // Write to file
    let output_path = Path::new("schema.graphql");
    fs::write(output_path, sdl)?;

    println!("GraphQL schema written to {}", output_path.display());

    Ok(())
}

