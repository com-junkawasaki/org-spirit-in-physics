// Merkle DAG: graphql.service.resolvers.mutation
// GraphQL Mutation resolvers

use juniper::FieldError;
use sqlx::{Pool, Postgres, Row};
use uuid::Uuid;
use serde_json::Value;
use chrono::Utc;
use base64::{Engine as _, engine::general_purpose};

use crate::schema::{Context, Participant, Session, CreateParticipantInput, CreateSessionInput, UploadArtifactInput};
use crate::storage::SupabaseStorage;

pub struct ParticipantMutation;

impl ParticipantMutation {
    /// Create a new participant with consent data
    pub async fn create_participant(
        ctx: &Context,
        input: CreateParticipantInput,
    ) -> Result<Participant, FieldError> {
        let pool = &ctx.pool;
        
        let participant_id = if let Some(id) = input.id {
            Uuid::parse_str(id.to_string().as_str())
                .map_err(|e| FieldError::new(format!("Invalid UUID: {}", e), juniper::Value::Null))?
        } else {
            Uuid::new_v4()
        };

        let agreed_at = chrono::DateTime::parse_from_rfc3339(&input.agreed_at)
            .map_err(|e| FieldError::new(format!("Invalid date format: {}", e), juniper::Value::Null))?
            .with_timezone(&Utc);

        // Default is_public to true if not provided
        let is_public = input.is_public.unwrap_or(true);

        // Insert participant into database
        sqlx::query(
            r#"
            INSERT INTO participants (id, is_public, created_at, updated_at)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO UPDATE SET updated_at = $4
            "#
        )
        .bind(participant_id)
        .bind(is_public)
        .bind(agreed_at)
        .bind(Utc::now())
        .execute(pool)
        .await
        .map_err(|e| FieldError::new(format!("Database error: {}", e), juniper::Value::Null))?;

        // Fetch the created participant
        let row = sqlx::query_as::<_, (Uuid, Option<i32>, Option<String>, Option<crate::types::HandednessType>, bool, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            "SELECT id, age, gender, handedness, is_public, created_at, updated_at FROM participants WHERE id = $1"
        )
        .bind(participant_id)
        .fetch_one(pool)
        .await
        .map_err(|e| FieldError::new(format!("Database error: {}", e), juniper::Value::Null))?;

        Ok(Participant {
            id: juniper::ID::from(row.0.to_string()),
            age: row.1,
            gender: row.2,
            handedness: row.3.map(|h| h.to_string()),
            is_public: row.4,
            created_at: row.5.to_rfc3339(),
            updated_at: row.6.to_rfc3339(),
        })
    }

    /// Create a new session for a participant
    pub async fn create_session(
        ctx: &Context,
        input: CreateSessionInput,
    ) -> Result<Session, FieldError> {
        let pool = &ctx.pool;
        
        let participant_uuid = Uuid::parse_str(input.participant_id.to_string().as_str())
            .map_err(|e| FieldError::new(format!("Invalid participant UUID: {}", e), juniper::Value::Null))?;

        let session_id = Uuid::new_v4();
        let now = Utc::now();

        // Parse events JSON
        let events: Vec<Value> = serde_json::from_value(input.events.clone())
            .map_err(|e| FieldError::new(format!("Invalid events format: {}", e), juniper::Value::Null))?;

        // Insert session into database (without events JSONB column)
        sqlx::query(
            r#"
            INSERT INTO sessions (id, participant_id, session_index, start_ts, end_ts, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#
        )
        .bind(session_id)
        .bind(participant_uuid)
        .bind(input.session_index)
        .bind(input.start_ts)
        .bind::<Option<i64>>(None)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await
        .map_err(|e| FieldError::new(format!("Database error: {}", e), juniper::Value::Null))?;

        // Insert events into session_events table
        for event in events {
            let event_type_str = event.get("type")
                .and_then(|v| v.as_str())
                .ok_or_else(|| FieldError::new("Event missing 'type' field", juniper::Value::Null))?;
            
            let event_timestamp = event.get("timestamp")
                .and_then(|v| v.as_i64())
                .unwrap_or(input.start_ts);
            
            let event_data = event.get("data")
                .map(|v| serde_json::to_string(v).unwrap_or_default());
            
            let word_id = event.get("word_id")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32);
            
            let reaction_time_ms = event.get("reaction_time_ms")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32);

            sqlx::query(
                r#"
                INSERT INTO session_events (session_id, event_type, event_timestamp, event_data, word_id, reaction_time_ms)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT DO NOTHING
                "#
            )
            .bind(session_id)
            .bind(event_type_str)
            .bind(event_timestamp)
            .bind(event_data)
            .bind(word_id)
            .bind(reaction_time_ms)
            .execute(pool)
            .await
            .map_err(|e| FieldError::new(format!("Database error: {}", e), juniper::Value::Null))?;
        }

        // Fetch the created session with events
        let row = sqlx::query(
            r#"
            SELECT 
                s.id,
                s.participant_id,
                s.session_index,
                s.start_ts,
                s.end_ts,
                s.created_at,
                s.updated_at,
                COALESCE(
                    json_agg(
                        jsonb_build_object(
                            'type', se.event_type::text,
                            'timestamp', se.event_timestamp,
                            'data', se.event_data,
                            'word_id', se.word_id,
                            'reaction_time_ms', se.reaction_time_ms
                        )
                    ) FILTER (WHERE se.id IS NOT NULL),
                    '[]'::json
                ) as events
            FROM sessions s
            LEFT JOIN session_events se ON se.session_id = s.id
            WHERE s.id = $1
            GROUP BY s.id, s.participant_id, s.session_index, s.start_ts, s.end_ts, s.created_at, s.updated_at
            "#
        )
        .bind(session_id)
        .fetch_one(pool)
        .await
        .map_err(|e| FieldError::new(format!("Database error: {}", e), juniper::Value::Null))?;

        let id: Uuid = row.try_get("id").map_err(|e| FieldError::new(format!("Failed to get id: {}", e), juniper::Value::Null))?;
        let participant_id: Uuid = row.try_get("participant_id").map_err(|e| FieldError::new(format!("Failed to get participant_id: {}", e), juniper::Value::Null))?;
        let session_index: Option<i32> = row.try_get("session_index").ok();
        let start_ts: i64 = row.try_get("start_ts").map_err(|e| FieldError::new(format!("Failed to get start_ts: {}", e), juniper::Value::Null))?;
        let end_ts: Option<i64> = row.try_get("end_ts").ok();
        let events_json: serde_json::Value = row.try_get("events").ok().unwrap_or_else(|| serde_json::json!([]));
        let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| FieldError::new(format!("Failed to get created_at: {}", e), juniper::Value::Null))?;
        let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").map_err(|e| FieldError::new(format!("Failed to get updated_at: {}", e), juniper::Value::Null))?;

        Ok(Session {
            id: juniper::ID::from(id.to_string()),
            participant_id: juniper::ID::from(participant_id.to_string()),
            session_index,
            start_ts,
            end_ts,
            events: serde_json::from_value(events_json).unwrap_or_default(),
            created_at: created_at.to_rfc3339(),
            updated_at: updated_at.to_rfc3339(),
        })
    }

    /// Upload an artifact (video, audio, etc.) to Supabase Storage
    pub async fn upload_artifact(
        _ctx: &Context,
        input: UploadArtifactInput,
    ) -> Result<String, FieldError> {
        // Decode base64 file data
        let file_data = general_purpose::STANDARD
            .decode(&input.file_data)
            .map_err(|e| FieldError::new(format!("Invalid base64 file data: {}", e), juniper::Value::Null))?;

        // Initialize Supabase Storage client
        let storage = SupabaseStorage::new()
            .map_err(|e| FieldError::new(format!("Failed to initialize storage: {}", e), juniper::Value::Null))?;

        // Upload file to Supabase Storage
        let public_url = storage
            .upload_file(
                input.participant_id.to_string().as_str(),
                &input.file_name,
                &file_data,
                &input.content_type,
            )
            .await
            .map_err(|e| FieldError::new(format!("Failed to upload artifact: {}", e), juniper::Value::Null))?;

        Ok(public_url)
    }
}
