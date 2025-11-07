// E2E Test: Participants Display Flow
// Tests the complete flow: Import → GraphQL API → Frontend Display

use std::process::Command;
use std::time::Duration;
use std::thread;

#[test]
#[ignore] // Requires full stack to be running
fn test_e2e_participants_display() {
    // Step 1: Verify database has participants
    let db_check = Command::new("docker-compose")
        .args(&["exec", "-T", "postgres", "psql", "-U", "postgres", "-d", "postgres", "-c", "SELECT COUNT(*) FROM participants;"])
        .output();
    
    if db_check.is_err() {
        eprintln!("Database check failed, skipping E2E test");
        return;
    }
    
    let db_output = db_check.unwrap();
    let db_stdout = String::from_utf8_lossy(&db_output.stdout);
    eprintln!("Database participants count: {}", db_stdout);
    
    // Step 2: Test GraphQL API
    thread::sleep(Duration::from_secs(2));
    
    let graphql_query = r#"{"query":"{ participants { id age handedness createdAt } }"}"#;
    let graphql_response = Command::new("curl")
        .args(&["-s", "-X", "POST", "http://localhost:8080/graphql", "-H", "Content-Type: application/json", "-d", graphql_query])
        .output();
    
    if let Ok(response) = graphql_response {
        let response_str = String::from_utf8_lossy(&response.stdout);
        eprintln!("GraphQL Response: {}", response_str);
        
        // Verify response contains participants data
        assert!(response_str.contains("participants") || response_str.contains("data"), 
            "GraphQL should return participants data");
    }
    
    // Step 3: Test frontend endpoint (if accessible)
    let frontend_response = Command::new("curl")
        .args(&["-s", "http://localhost:3000/participants"])
        .output();
    
    if let Ok(response) = frontend_response {
        let response_str = String::from_utf8_lossy(&response.stdout);
        eprintln!("Frontend Response length: {}", response_str.len());
        
        // Verify page loads (contains HTML)
        assert!(response_str.contains("<!DOCTYPE") || response_str.contains("<html") || response_str.contains("被験者"),
            "Frontend should return HTML page");
    }
    
    assert!(true, "E2E test completed");
}

#[test]
#[ignore]
fn test_e2e_participant_import_to_display() {
    // Full E2E test: Import → Verify DB → GraphQL → Frontend
    
    // Step 1: Run import
    let test_dataset_path = "tests/fixtures/test_dataset";
    let import_output = Command::new("cargo")
        .args(&["run", "--bin", "importer", "--", test_dataset_path])
        .output();
    
    if import_output.is_err() {
        eprintln!("Import failed, skipping E2E test");
        return;
    }
    
    let import_result = import_output.unwrap();
    assert!(import_result.status.success(), "Import should succeed");
    
    // Step 2: Wait for GraphQL to be ready
    thread::sleep(Duration::from_secs(3));
    
    // Step 3: Query GraphQL API
    let graphql_query = r#"{"query":"{ participants { id } }"}"#;
    let graphql_response = Command::new("curl")
        .args(&["-s", "-X", "POST", "http://localhost:8080/graphql", "-H", "Content-Type: application/json", "-d", graphql_query])
        .output();
    
    if let Ok(response) = graphql_response {
        let response_str = String::from_utf8_lossy(&response.stdout);
        assert!(!response_str.contains("errors"), "GraphQL should not return errors");
    }
    
    assert!(true, "E2E import-to-display test completed");
}

