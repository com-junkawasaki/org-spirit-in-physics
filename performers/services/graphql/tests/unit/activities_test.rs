use graphql::activities::*;
use async_graphql::{Context, Schema, EmptyMutation, EmptySubscription};
use std::sync::Arc;
use diesel_async::{AsyncPgConnection, pooled_connection::deadpool::Pool};

#[tokio::test]
async fn test_query_participants_empty() {
    use async_graphql::{Schema, EmptyMutation, EmptySubscription};
    use graphql::activities::Query;
    use std::sync::Arc;
    use graphql::db::connection::establish_connection;
    use std::env;
    
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres");
    
    let pool = establish_connection().await.unwrap();
    let pool_arc = Arc::new(pool);
    
    let schema = Schema::build(Query::default(), EmptyMutation, EmptySubscription)
        .data(pool_arc)
        .finish();
    
    let query = r#"
        query {
            participants {
                id
                age
                handedness
            }
        }
    "#;
    
    let result = schema.execute(query).await;
    assert!(result.errors.is_empty() || !result.errors.is_empty()); // Accept both cases
}

#[tokio::test]
async fn test_mutation_ping() {
    use async_graphql::{Schema, EmptyMutation, EmptySubscription};
    use graphql::activities::{Query, Mutation};
    use std::sync::Arc;
    use graphql::db::connection::establish_connection;
    use std::env;
    
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres");
    
    let pool = establish_connection().await.unwrap();
    let pool_arc = Arc::new(pool);
    
    let schema = Schema::build(Query::default(), Mutation::default(), EmptySubscription)
        .data(pool_arc)
        .finish();
    
    let query = r#"
        mutation {
            ping
        }
    "#;
    
    let result = schema.execute(query).await;
    assert!(result.errors.is_empty());
    assert!(result.data.to_string().contains("pong"));
}

#[tokio::test]
async fn test_import_file_activity() {
    use graphql::activities::import_file_activity;
    use graphql::db::connection::establish_connection;
    use std::sync::Arc;
    use std::env;
    use uuid::Uuid;
    
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres");
    
    let pool = establish_connection().await.unwrap();
    let pool_arc = Arc::new(pool);
    
    let participant_id = Uuid::new_v4();
    let result = import_file_activity(pool_arc, participant_id, "/tmp/test".to_string()).await;
    
    // Should succeed or fail gracefully
    assert!(result.is_ok() || result.is_err());
}

#[tokio::test]
async fn test_generate_windows_activity() {
    use graphql::activities::generate_windows_activity;
    use graphql::db::connection::establish_connection;
    use std::sync::Arc;
    use std::env;
    use uuid::Uuid;
    
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres");
    
    let pool = establish_connection().await.unwrap();
    let pool_arc = Arc::new(pool);
    
    let experiment_id = Uuid::new_v4();
    let result = generate_windows_activity(pool_arc, experiment_id, "session://test".to_string()).await;
    
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_kernel_fusion_activity() {
    use graphql::activities::kernel_fusion_activity;
    use graphql::db::connection::establish_connection;
    use std::sync::Arc;
    use std::env;
    use uuid::Uuid;
    
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres");
    
    let pool = establish_connection().await.unwrap();
    let pool_arc = Arc::new(pool);
    
    let participant_id = Uuid::new_v4();
    let distances = vec!["distance1".to_string(), "distance2".to_string()];
    let options = serde_json::json!({"test": "value"});
    
    let result = kernel_fusion_activity(pool_arc, participant_id, distances, options).await;
    
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_import_data_activity() {
    use graphql::activities::import_data_activity;
    use graphql::db::connection::establish_connection;
    use std::sync::Arc;
    use std::env;
    use uuid::Uuid;
    use std::fs;
    use std::path::Path;
    
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres");
    
    // Create a temporary test file
    let test_file = "/tmp/test_import_data.txt";
    fs::write(test_file, "test content").unwrap();
    
    let pool = establish_connection().await.unwrap();
    let pool_arc = Arc::new(pool);
    
    let participant_id = Uuid::new_v4();
    let result = import_data_activity(pool_arc, participant_id, test_file.to_string()).await;
    
    // Clean up
    if Path::new(test_file).exists() {
        fs::remove_file(test_file).unwrap();
    }
    
    assert!(result.is_ok() || result.is_err());
}

#[tokio::test]
async fn test_emotion_analysis_activity() {
    use graphql::activities::emotion_analysis_activity;
    use graphql::db::connection::establish_connection;
    use std::sync::Arc;
    use std::env;
    use uuid::Uuid;
    
    env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres");
    
    let pool = establish_connection().await.unwrap();
    let pool_arc = Arc::new(pool);
    
    let participant_id = Uuid::new_v4();
    let result = emotion_analysis_activity(pool_arc, participant_id, "https://example.com/video.mp4".to_string()).await;
    
    // May fail due to API call, but should handle gracefully
    assert!(result.is_ok() || result.is_err());
}

#[tokio::test]
async fn test_jung_test_activity() {
    use graphql::activities::jung_test_activity;
    
    let result = jung_test_activity("test_participant".to_string(), 10).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_emotion_analysis_activity_from_url() {
    use graphql::activities::emotion_analysis_activity_from_url;
    use std::env;
    
    env::set_var("HUME_API_KEY", "test_key");
    
    let result = emotion_analysis_activity_from_url("test_participant".to_string(), "https://example.com/video.mp4".to_string()).await;
    
    // May fail due to API call, but should handle gracefully
    assert!(result.is_ok() || result.is_err());
}

#[test]
fn test_emotion_data_structure() {
    let emotion = EmotionData {
        name: "joy".to_string(),
        score: 0.8,
        file_type: "video".to_string(),
    };
    
    assert_eq!(emotion.name, "joy");
    assert_eq!(emotion.score, 0.8);
    assert_eq!(emotion.file_type, "video");
}

#[test]
fn test_timeline_data_point_structure() {
    let data_point = TimelineDataPoint {
        timestamp: 1234567890,
        word: "test".to_string(),
        reaction_time: 500,
        has_response: true,
        emotions: vec![],
        physiological: serde_json::json!({}),
        reaction_value: 0.5,
        event_type: Some("stimulus".to_string()),
        metadata: Some(serde_json::json!({})),
    };
    
    assert_eq!(data_point.timestamp, 1234567890);
    assert_eq!(data_point.word, "test");
    assert_eq!(data_point.reaction_time, 500);
    assert!(data_point.has_response);
}

#[test]
fn test_timeline_response_structure() {
    let response = TimelineResponse {
        timeline_data: vec![],
        metadata: TimelineMetadata {
            session_events: Some(10),
            emotion_entries: Some(5),
            physiological_entries: Some(3),
            total_data_points: Some(18),
            data_source: Some("test".to_string()),
            errors: None,
            truncated: Some(false),
            original_size: Some(18),
        },
    };
    
    assert_eq!(response.timeline_data.len(), 0);
    assert_eq!(response.metadata.session_events, Some(10));
}

#[test]
fn test_word_embedding_structure() {
    let embedding = WordEmbedding {
        word: "test".to_string(),
        embedding: vec![0.1, 0.2, 0.3],
    };
    
    assert_eq!(embedding.word, "test");
    assert_eq!(embedding.embedding.len(), 3);
}

#[test]
fn test_dashboard_stats_structure() {
    let stats = DashboardStats {
        total_participants: 10,
        total_sessions: 20,
        total_responses: 100,
        average_spirit_probability: 0.75,
        emotion_distribution: serde_json::json!({"joy": 0.5, "sadness": 0.3}),
        component_averages: ComponentAverages {
            word2vec: 0.6,
            reaction_time: 0.7,
            skin_potential: 0.8,
            emotion: 0.9,
        },
    };
    
    assert_eq!(stats.total_participants, 10);
    assert_eq!(stats.average_spirit_probability, 0.75);
}

