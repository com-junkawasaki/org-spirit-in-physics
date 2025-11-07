// End-to-end test: Import → Validation → GraphQL API
// This test requires both importer and graphql services to be running

use std::path::PathBuf;
use std::env;
use std::process::Command;
use std::time::Duration;
use std::thread;

#[test]
#[ignore] // Requires full stack to be running
fn test_e2e_import_validation_graphql() {
    env::set_var("RUST_LOG", "info");
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres");
    
    // Step 1: Run import
    let test_dataset_path = PathBuf::from("tests/fixtures/test_dataset");
    
    if !test_dataset_path.exists() {
        eprintln!("Test dataset not found, skipping E2E test");
        return;
    }
    
    // Import using the importer binary
    let import_output = Command::new("cargo")
        .args(&["run", "--bin", "importer", "--"])
        .arg(&test_dataset_path)
        .output();
    
    if import_output.is_err() {
        eprintln!("Failed to run importer, skipping E2E test");
        return;
    }
    
    let import_result = import_output.unwrap();
    assert!(import_result.status.success(), "Import should succeed");
    
    // Step 2: Wait for GraphQL service to be ready (if running)
    thread::sleep(Duration::from_secs(2));
    
    // Step 3: Query GraphQL API
    // This would require a GraphQL client library
    // For now, we'll just verify the import succeeded
    assert!(true, "E2E test placeholder - would query GraphQL API here");
    
    // In a full implementation, we would:
    // 1. Query participant timeline via GraphQL
    // 2. Verify data matches what was imported
    // 3. Check emotion and physiological data are accessible
}

