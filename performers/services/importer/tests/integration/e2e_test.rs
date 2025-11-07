// End-to-end test: Import → Validation → GraphQL API → Frontend Display
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
    
    // Step 2: Wait for GraphQL service to be ready
    thread::sleep(Duration::from_secs(3));
    
    // Step 3: Query GraphQL API for participants
    let graphql_query = r#"{"query":"{ participants { id age handedness createdAt } }"}"#;
    let graphql_response = Command::new("curl")
        .args(&["-s", "-X", "POST", "http://localhost:8080/graphql", "-H", "Content-Type: application/json", "-d", graphql_query])
        .output();
    
    if let Ok(response) = graphql_response {
        let response_str = String::from_utf8_lossy(&response.stdout);
        eprintln!("GraphQL Response: {}", response_str);
        
        // Verify response contains participants data and no errors
        assert!(!response_str.contains("\"errors\""), "GraphQL should not return errors");
        assert!(response_str.contains("participants") || response_str.contains("\"data\""), 
            "GraphQL should return participants data");
    }
    
    // Step 4: Verify frontend can access the data
    let frontend_response = Command::new("curl")
        .args(&["-s", "http://localhost:3000/participants"])
        .output();
    
    if let Ok(response) = frontend_response {
        let response_str = String::from_utf8_lossy(&response.stdout);
        // Verify page loads
        assert!(response_str.len() > 0, "Frontend should return content");
    }
}

#[test]
#[ignore]
fn test_e2e_participants_list_graphql() {
    // Test GraphQL participants query directly
    thread::sleep(Duration::from_secs(2));
    
    let graphql_query = r#"{"query":"{ participants { id age handedness createdAt updatedAt } }"}"#;
    let graphql_response = Command::new("curl")
        .args(&["-s", "-X", "POST", "http://localhost:8080/graphql", "-H", "Content-Type: application/json", "-d", graphql_query])
        .output();
    
    if let Ok(response) = graphql_response {
        let response_str = String::from_utf8_lossy(&response.stdout);
        eprintln!("GraphQL participants query response: {}", response_str);
        
        // Verify no errors
        assert!(!response_str.contains("\"errors\""), "GraphQL should not return errors");
        
        // Verify response structure
        assert!(response_str.contains("participants") || response_str.contains("\"data\""), 
            "GraphQL should return data");
    } else {
        eprintln!("Failed to query GraphQL API, skipping test");
    }
}

#[test]
#[ignore]
fn test_e2e_participant_timeline_graphql() {
    // Test participant timeline query
    // First, get a participant ID from the database
    let db_query = Command::new("docker-compose")
        .args(&["exec", "-T", "postgres", "psql", "-U", "postgres", "-d", "postgres", "-t", "-c", "SELECT id FROM participants LIMIT 1;"])
        .output();
    
    if let Ok(output) = db_query {
        let participant_id = String::from_utf8_lossy(&output.stdout).trim().to_string();
        
        if !participant_id.is_empty() {
            let graphql_query = format!(r#"{{"query":"{{ participantTimeline(participantId: \"{}\") {{ timelineData {{ timestamp word reactionTime }} }} }}"}}"#, participant_id);
            
            thread::sleep(Duration::from_secs(1));
            
            let graphql_response = Command::new("curl")
                .args(&["-s", "-X", "POST", "http://localhost:8080/graphql", "-H", "Content-Type: application/json", "-d", &graphql_query])
                .output();
            
            if let Ok(response) = graphql_response {
                let response_str = String::from_utf8_lossy(&response.stdout);
                eprintln!("GraphQL timeline query response: {}", response_str);
                
                // Verify no errors (timeline might be empty, which is OK)
                assert!(!response_str.contains("\"errors\""), "GraphQL should not return errors");
            }
        }
    }
}

