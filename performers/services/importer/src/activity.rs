use std::path::{Path, PathBuf};
use anyhow::{Result, Context};
use tracing::{info, warn};

use crate::db::{establish_connection, get_connection};
use crate::parsers::{
    parse_session_data, parse_consent, parse_physiological_csv, parse_hume_csv,
    extract_session_boundaries, extract_word_responses,
};
use crate::importers::{
    get_or_create_participant, import_consent,
    import_session, import_session_events,
    import_word_responses_batch,
    import_physiological_data, find_physiological_records_for_response,
    import_emotion_data_from_records, find_emotion_records_for_response,
};

/// Main function to import a participant dataset
pub fn import_participant_dataset(dataset_path: &Path) -> Result<()> {
    info!("Starting import for dataset: {:?}", dataset_path);

    // Establish database connection
    let pool = establish_connection()
        .context("Failed to establish database connection")?;
    let mut conn = get_connection(&pool)
        .context("Failed to get database connection")?;

    // Parse session_data.json
    let session_data_path = dataset_path.join("session_data.json");
    if !session_data_path.exists() {
        return Err(anyhow::anyhow!("session_data.json not found in dataset folder"));
    }
    let session_data = parse_session_data(&session_data_path)
        .context("Failed to parse session_data.json")?;

    info!("Parsed session data for participant: {}", session_data.participant_id);

    // Get or create participant
    let participant_id = get_or_create_participant(&mut conn, &session_data.participant_id)
        .context("Failed to get or create participant")?;
    info!("Participant ID: {}", participant_id);

    // Parse and import consent
    let consent_path = dataset_path.join("consent.json");
    if consent_path.exists() {
        let consent = parse_consent(&consent_path)
            .context("Failed to parse consent.json")?;
        import_consent(&mut conn, participant_id, &consent)
            .context("Failed to import consent")?;
        info!("Imported consent data");
    } else {
        warn!("consent.json not found, skipping consent import");
    }

    // Extract session boundaries
    let boundaries = extract_session_boundaries(&session_data.events);
    info!("Found {} session(s)", boundaries.len());

    // Parse physiological CSV if exists
    let physiological_csv_path = find_physiological_csv(dataset_path)?;
    let physiological_data = if let Some(path) = &physiological_csv_path {
        Some(parse_physiological_csv(path)
            .context("Failed to parse physiological CSV")?)
    } else {
        None
    };

    // Parse HumeAI artifacts
    let hume_artifacts = find_hume_artifacts(dataset_path)?;

    // Process each session
    for boundary in &boundaries {
        info!("Processing session {}", boundary.session_number);

        // Create session
        let session_id = import_session(&mut conn, participant_id, boundary)
            .context("Failed to import session")?;

        // Filter events for this session
        let session_events: Vec<_> = session_data.events
            .iter()
            .filter(|e| {
                e.timestamp >= boundary.start_timestamp
                    && boundary.end_timestamp.map_or(true, |end| e.timestamp <= end)
            })
            .cloned()
            .collect();

        // Import session events
        import_session_events(&mut conn, participant_id, session_id, &session_events)
            .context("Failed to import session events")?;

        // Extract word responses for this session
        let word_responses = extract_word_responses(&session_events);
        info!("Found {} word responses in session {}", word_responses.len(), boundary.session_number);

        // Determine session type
        let session_type = match boundary.session_number {
            1 => "practice",
            _ => "experiment",
        };

        // Use session_id as experiment_id for now
        let experiment_id = session_id;

        // Import word responses
        let response_ids = import_word_responses_batch(
            &mut conn,
            participant_id,
            experiment_id,
            session_id,
            session_type,
            &word_responses,
            boundary.start_timestamp,
        ).context("Failed to import word responses")?;

        // Import physiological data for each response
        if let Some(ref phys_data) = physiological_data {
            for (response, response_id) in word_responses.iter().zip(response_ids.iter()) {
                // Find physiological records within a window around the response
                let window_before_ms = 5000; // 5 seconds before
                let window_after_ms = 10000; // 10 seconds after
                
                let relevant_records = find_physiological_records_for_response(
                    &phys_data.records,
                    response.word_displayed_timestamp,
                    window_before_ms,
                    window_after_ms,
                );

                if !relevant_records.is_empty() {
                    import_physiological_data(
                        &mut conn,
                        *response_id,
                        &relevant_records,
                        boundary.start_timestamp,
                    ).context("Failed to import physiological data")?;
                }
            }
            info!("Imported physiological data for session {}", boundary.session_number);
        }

        // Import emotion data from HumeAI artifacts
        if let Some(ref artifacts) = hume_artifacts {
            for (response, response_id) in word_responses.iter().zip(response_ids.iter()) {
                let window_before_ms = 5000;
                let window_after_ms = 10000;

                // Process face data
                if let Some(ref face_records) = artifacts.face {
                    let relevant_records = find_emotion_records_for_response(
                        face_records,
                        response.word_displayed_timestamp,
                        window_before_ms,
                        window_after_ms,
                    );
                    if !relevant_records.is_empty() {
                        import_emotion_data_from_records(
                            &mut conn,
                            *response_id,
                            &relevant_records,
                            boundary.start_timestamp,
                            "hume_face",
                        ).context("Failed to import face emotion data")?;
                    }
                }

                // Process prosody data
                if let Some(ref prosody_records) = artifacts.prosody {
                    let relevant_records = find_emotion_records_for_response(
                        prosody_records,
                        response.word_displayed_timestamp,
                        window_before_ms,
                        window_after_ms,
                    );
                    if !relevant_records.is_empty() {
                        import_emotion_data_from_records(
                            &mut conn,
                            *response_id,
                            &relevant_records,
                            boundary.start_timestamp,
                            "hume_prosody",
                        ).context("Failed to import prosody emotion data")?;
                    }
                }

                // Process language data
                if let Some(ref language_records) = artifacts.language {
                    let relevant_records = find_emotion_records_for_response(
                        language_records,
                        response.word_displayed_timestamp,
                        window_before_ms,
                        window_after_ms,
                    );
                    if !relevant_records.is_empty() {
                        import_emotion_data_from_records(
                            &mut conn,
                            *response_id,
                            &relevant_records,
                            boundary.start_timestamp,
                            "hume_language",
                        ).context("Failed to import language emotion data")?;
                    }
                }

                // Process burst data
                if let Some(ref burst_records) = artifacts.burst {
                    let relevant_records = find_emotion_records_for_response(
                        burst_records,
                        response.word_displayed_timestamp,
                        window_before_ms,
                        window_after_ms,
                    );
                    if !relevant_records.is_empty() {
                        import_emotion_data_from_records(
                            &mut conn,
                            *response_id,
                            &relevant_records,
                            boundary.start_timestamp,
                            "hume_burst",
                        ).context("Failed to import burst emotion data")?;
                    }
                }
            }
            info!("Imported emotion data for session {}", boundary.session_number);
        }
    }

    info!("Import completed successfully");
    
    // Run validation with timeout (60 seconds max)
    info!("Running data validation (max 60 seconds)...");
    let validation_start = std::time::Instant::now();
    
    match crate::validation::validate_imported_data(&mut conn, participant_id) {
        Ok(validation_report) => {
            let validation_duration = validation_start.elapsed();
            let summary = validation_report.summary();
            info!("Validation completed in {:?}:\n{}", validation_duration, summary);
            
            if validation_duration.as_secs() > 60 {
                warn!("Validation took longer than 60 seconds: {:?}", validation_duration);
            }
            
            if !validation_report.passed {
                warn!("Validation found errors. Please review the report above.");
            } else if !validation_report.warnings.is_empty() {
                warn!("Validation completed with warnings. Please review the report above.");
            } else {
                info!("All validation checks passed!");
            }
        }
        Err(e) => {
            let validation_duration = validation_start.elapsed();
            if validation_duration.as_secs() > 60 {
                warn!("Validation timed out after {:?}: {}. Continuing anyway.", validation_duration, e);
            } else {
                warn!("Validation failed after {:?}: {}. Continuing anyway.", validation_duration, e);
            }
        }
    }
    
    Ok(())
}

/// Find physiological CSV file in dataset folder
fn find_physiological_csv(dataset_path: &Path) -> Result<Option<PathBuf>> {
    // Look for CSV files in the dataset folder
    let entries = std::fs::read_dir(dataset_path)
        .context("Failed to read dataset directory")?;

    for entry in entries {
        let entry = entry.context("Failed to read directory entry")?;
        let path = entry.path();
        
        if path.extension().and_then(|s| s.to_str()) == Some("CSV") {
            // Check if it looks like a physiological CSV (has Time_Sec column)
            if let Ok(content) = std::fs::read_to_string(&path) {
                if content.contains("Time_Sec") && content.contains("Ch1") {
                    return Ok(Some(path));
                }
            }
        }
    }

    Ok(None)
}

/// HumeAI artifacts structure
struct HumeArtifacts {
    face: Option<Vec<std::collections::HashMap<String, String>>>,
    prosody: Option<Vec<std::collections::HashMap<String, String>>>,
    language: Option<Vec<std::collections::HashMap<String, String>>>,
    burst: Option<Vec<std::collections::HashMap<String, String>>>,
}

/// Find and parse HumeAI artifacts
fn find_hume_artifacts(dataset_path: &Path) -> Result<Option<HumeArtifacts>> {
    // Look for HumeAI_artifacts_* directories
    let entries = std::fs::read_dir(dataset_path)
        .context("Failed to read dataset directory")?;

    let mut artifacts_dir: Option<PathBuf> = None;
    for entry in entries {
        let entry = entry.context("Failed to read directory entry")?;
        let path = entry.path();
        
        if path.is_dir() {
            let dir_name = path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("");
            
            if dir_name.starts_with("HumeAI_artifacts_") {
                artifacts_dir = Some(path);
                break;
            }
        }
    }

    let artifacts_dir = match artifacts_dir {
        Some(dir) => dir,
        None => return Ok(None),
    };

    info!("Found HumeAI artifacts directory: {:?}", artifacts_dir);

    // Look for registry_file-* directories
    let registry_entries = std::fs::read_dir(&artifacts_dir)
        .context("Failed to read artifacts directory")?;

    let mut face_records = None;
    let mut prosody_records = None;
    let mut language_records = None;
    let mut burst_records = None;

    for entry in registry_entries {
        let entry = entry.context("Failed to read artifacts directory entry")?;
        let registry_path = entry.path();
        
        if registry_path.is_dir() && registry_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .starts_with("registry_file-") {
            
            // Look for csv subdirectory
            let csv_dir = registry_path.join("csv");
            if csv_dir.exists() {
                // Find the subdirectory inside csv
                let csv_entries = std::fs::read_dir(&csv_dir)
                    .context("Failed to read csv directory")?;
                
                for csv_entry in csv_entries {
                    let csv_entry = csv_entry.context("Failed to read csv directory entry")?;
                    let csv_subdir = csv_entry.path();
                    
                    if csv_subdir.is_dir() {
                        // Look for CSV files
                        let face_csv = csv_subdir.join("face.csv");
                        let prosody_csv = csv_subdir.join("prosody.csv");
                        let language_csv = csv_subdir.join("language.csv");
                        let burst_csv = csv_subdir.join("burst.csv");

                        if face_csv.exists() && face_records.is_none() {
                            face_records = Some(parse_hume_csv(&face_csv)
                                .context("Failed to parse face.csv")?);
                        }
                        if prosody_csv.exists() && prosody_records.is_none() {
                            prosody_records = Some(parse_hume_csv(&prosody_csv)
                                .context("Failed to parse prosody.csv")?);
                        }
                        if language_csv.exists() && language_records.is_none() {
                            language_records = Some(parse_hume_csv(&language_csv)
                                .context("Failed to parse language.csv")?);
                        }
                        if burst_csv.exists() && burst_records.is_none() {
                            burst_records = Some(parse_hume_csv(&burst_csv)
                                .context("Failed to parse burst.csv")?);
                        }
                    }
                }
            }
        }
    }

    if face_records.is_none() && prosody_records.is_none() 
        && language_records.is_none() && burst_records.is_none() {
        return Ok(None);
    }

    Ok(Some(HumeArtifacts {
        face: face_records,
        prosody: prosody_records,
        language: language_records,
        burst: burst_records,
    }))
}

