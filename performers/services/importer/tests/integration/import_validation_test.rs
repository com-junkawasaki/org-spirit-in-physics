use std::path::PathBuf;
use std::env;
use testcontainers::{clients, images::postgres::Postgres};
use testcontainers::Container;
use importer::{import_participant_dataset, db::establish_connection, validation::validate_imported_data};
use uuid::Uuid;

fn setup_test_database() -> (clients::Cli, Container<'_, Postgres>, String) {
    let docker = clients::Cli::default();
    let postgres_image = Postgres::default();
    let container = docker.run(postgres_image);
    
    let port = container.get_host_port_ipv4(5432);
    let database_url = format!("postgresql://postgres:postgres@localhost:{}/postgres", port);
    
    // Wait for database to be ready
    std::thread::sleep(std::time::Duration::from_secs(2));
    
    // Run migrations
    let output = std::process::Command::new("diesel")
        .args(&["migration", "run"])
        .env("DATABASE_URL", &database_url)
        .output();
    
    // If diesel is not available, skip migration (tests will use existing schema)
    if output.is_err() {
        eprintln!("Warning: diesel CLI not found, skipping migrations");
    }
    
    (docker, container, database_url)
}

#[test]
#[ignore] // Requires docker and testcontainers setup
fn test_import_and_validate() {
    env::set_var("RUST_LOG", "info");
    
    let (_docker, _container, database_url) = setup_test_database();
    env::set_var("DATABASE_URL", &database_url);
    
    // Use a test dataset path (would need to be created)
    let test_dataset_path = PathBuf::from("tests/fixtures/test_dataset");
    
    if !test_dataset_path.exists() {
        eprintln!("Test dataset not found at {:?}, skipping test", test_dataset_path);
        return;
    }
    
    // Run import
    let import_result = import_participant_dataset(&test_dataset_path);
    assert!(import_result.is_ok(), "Import should succeed");
    
    // Extract participant ID from test dataset
    // This would need to be parsed from the dataset
    let participant_id = Uuid::parse_str("test-participant-id").unwrap();
    
    // Run validation
    let pool = establish_connection().expect("Failed to establish connection");
    let mut conn = pool.get().expect("Failed to get connection");
    
    let validation_result = validate_imported_data(&mut conn, participant_id);
    assert!(validation_result.is_ok(), "Validation should succeed");
    
    let report = validation_result.unwrap();
    assert!(report.passed, "Validation should pass");
    assert!(report.errors.is_empty(), "Should have no errors");
}

