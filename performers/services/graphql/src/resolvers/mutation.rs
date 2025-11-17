// Merkle DAG: graphql.service.resolvers.mutation
// GraphQL Mutation resolvers

use async_graphql::*;
use sqlx::{Pool, Postgres, Row};
use uuid::Uuid;
use serde_json::Value;
use chrono::Utc;
use base64::{Engine as _, engine::general_purpose};

use crate::types::{Participant, Session, ForceGraphSimulationInput, PhysicsParamsInput};
use crate::storage::SupabaseStorage;
use crate::physics::SimulationManager;
use uuid;

#[derive(InputObject)]
pub struct CreateParticipantInput {
    pub id: Option<ID>,
    pub signature: String,
    pub agreements: Value,
    pub agreed_at: String,
}

#[derive(InputObject)]
pub struct CreateSessionInput {
    pub participant_id: ID,
    pub session_index: Option<i32>,
    pub start_ts: i64,
    pub events: Value,
}

#[derive(InputObject)]
pub struct UploadArtifactInput {
    pub participant_id: ID,
    pub file_name: String,
    pub file_data: String, // Base64 encoded file data
    pub content_type: String, // MIME type (e.g., "video/webm")
    pub artifact_type: String, // "video", "audio", "consent", "session_data"
}

#[derive(Default)]
pub struct ParticipantMutation;

#[Object]
impl ParticipantMutation {
    /// Create a new participant with consent data
    async fn create_participant(
        &self,
        ctx: &Context<'_>,
        input: CreateParticipantInput,
    ) -> Result<Participant> {
        let pool = ctx.data::<Pool<Postgres>>()?;
        
        let participant_id = if let Some(id) = input.id {
            Uuid::parse_str(id.as_str())
                .map_err(|e| Error::from(format!("Invalid UUID: {}", e)))?
        } else {
            Uuid::new_v4()
        };

        let agreed_at = chrono::DateTime::parse_from_rfc3339(&input.agreed_at)
            .map_err(|e| Error::from(format!("Invalid date format: {}", e)))?
            .with_timezone(&Utc);

        // Insert participant into database
        sqlx::query(
            r#"
            INSERT INTO participants (id, created_at, updated_at)
            VALUES ($1, $2, $3)
            ON CONFLICT (id) DO UPDATE SET updated_at = $3
            "#
        )
        .bind(participant_id)
        .bind(agreed_at)
        .bind(Utc::now())
        .execute(pool)
        .await?;

        // Store consent data in a separate table or JSONB column if needed
        // For now, we'll just return the participant

        // Fetch the created participant
        let row = sqlx::query_as::<_, (Uuid, Option<i32>, Option<String>, Option<crate::types::HandednessType>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            "SELECT id, age, gender, handedness, created_at, updated_at FROM participants WHERE id = $1"
        )
        .bind(participant_id)
        .fetch_one(pool)
        .await?;

        Ok(Participant {
            id: ID::from(row.0.to_string()),
            age: row.1,
            gender: row.2,
            handedness: row.3.map(|h| h.to_string()),
            created_at: row.4.to_rfc3339(),
            updated_at: row.5.to_rfc3339(),
        })
    }

    /// Create a new session for a participant
    async fn create_session(
        &self,
        ctx: &Context<'_>,
        input: CreateSessionInput,
    ) -> Result<Session> {
        let pool = ctx.data::<Pool<Postgres>>()?;
        
        let participant_uuid = Uuid::parse_str(input.participant_id.as_str())
            .map_err(|e| Error::from(format!("Invalid participant UUID: {}", e)))?;

        let session_id = Uuid::new_v4();
        let now = Utc::now();

        // Parse events JSON
        let events: Vec<Value> = serde_json::from_value(input.events.clone())
            .map_err(|e| Error::from(format!("Invalid events format: {}", e)))?;

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
        .await?;

        // Insert events into session_events table
        for event in events {
            let event_type_str = event.get("type")
                .and_then(|v| v.as_str())
                .ok_or_else(|| Error::from("Event missing 'type' field"))?;
            
                   // Cast event type string to session_event_type_enum (no master table lookup)
                   let event_type: String = event_type_str.to_string();

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
            .await?;
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
            LEFT JOIN event_types et ON et.id = se.event_type_id
            WHERE s.id = $1
            GROUP BY s.id, s.participant_id, s.session_index, s.start_ts, s.end_ts, s.created_at, s.updated_at
            "#
        )
        .bind(session_id)
        .fetch_one(pool)
        .await?;

        let id: Uuid = row.try_get("id").map_err(|e| Error::from(format!("Failed to get id: {}", e)))?;
        let participant_id: Uuid = row.try_get("participant_id").map_err(|e| Error::from(format!("Failed to get participant_id: {}", e)))?;
        let session_index: Option<i32> = row.try_get("session_index").ok();
        let start_ts: i64 = row.try_get("start_ts").map_err(|e| Error::from(format!("Failed to get start_ts: {}", e)))?;
        let end_ts: Option<i64> = row.try_get("end_ts").ok();
        let events_json: serde_json::Value = row.try_get("events").ok().unwrap_or_else(|| serde_json::json!([]));
        let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| Error::from(format!("Failed to get created_at: {}", e)))?;
        let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").map_err(|e| Error::from(format!("Failed to get updated_at: {}", e)))?;

        Ok(Session {
            id: ID::from(id.to_string()),
            participant_id: ID::from(participant_id.to_string()),
            session_index,
            start_ts,
            end_ts,
            events: serde_json::from_value(events_json).unwrap_or_default(),
            created_at: created_at.to_rfc3339(),
            updated_at: updated_at.to_rfc3339(),
        })
    }

    /// Upload an artifact (video, audio, etc.) to Supabase Storage
    async fn upload_artifact(
        &self,
        _ctx: &Context<'_>,
        input: UploadArtifactInput,
    ) -> Result<String> {
        // Decode base64 file data
        let file_data = general_purpose::STANDARD
            .decode(&input.file_data)
            .map_err(|e| Error::from(format!("Invalid base64 file data: {}", e)))?;

        // Initialize Supabase Storage client
        let storage = SupabaseStorage::new()
            .map_err(|e| Error::from(format!("Failed to initialize storage: {}", e)))?;

        // Upload file to Supabase Storage
        let public_url = storage
            .upload_file(
                input.participant_id.as_str(),
                &input.file_name,
                &file_data,
                &input.content_type,
            )
            .await
            .map_err(|e| Error::from(format!("Failed to upload artifact: {}", e)))?;

        Ok(public_url)
    }
}

#[derive(Default)]
pub struct ForceGraphMutation;

#[Object]
impl ForceGraphMutation {
    /// Create a new force graph simulation
    async fn create_force_graph_simulation(
        &self,
        ctx: &Context<'_>,
        input: ForceGraphSimulationInput,
    ) -> Result<String> {
        let simulation_manager = ctx.data::<SimulationManager>()?;
        let simulation_id = uuid::Uuid::new_v4().to_string();
        
        simulation_manager
            .create_simulation(simulation_id.clone(), input)
            .await
            .map_err(|e| Error::from(e))?;
        
        Ok(simulation_id)
    }
    
    /// Update physics parameters for a simulation
    async fn update_force_graph_physics(
        &self,
        ctx: &Context<'_>,
        simulation_id: String,
        physics: PhysicsParamsInput,
    ) -> Result<bool> {
        let simulation_manager = ctx.data::<SimulationManager>()?;
        
        simulation_manager
            .update_physics(&simulation_id, physics)
            .await
            .map_err(|e| Error::from(e))?;
        
        Ok(true)
    }
    
    /// Stop and remove a simulation
    async fn stop_force_graph_simulation(
        &self,
        ctx: &Context<'_>,
        simulation_id: String,
    ) -> Result<bool> {
        let simulation_manager = ctx.data::<SimulationManager>()?;
        
        simulation_manager
            .stop_simulation(&simulation_id)
            .await
            .map_err(|e| Error::from(e))?;
        
        Ok(true)
    }
}

