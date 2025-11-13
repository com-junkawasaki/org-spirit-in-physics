// Merkle DAG: graphql.service.resolvers.mutation
// GraphQL Mutation resolvers

use async_graphql::*;
use sqlx::{Pool, Postgres};
use uuid::Uuid;
use serde_json::Value;
use chrono::Utc;

use crate::types::{Participant, Session};

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
                .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?
        } else {
            Uuid::new_v4()
        };

        let agreed_at = chrono::DateTime::parse_from_rfc3339(&input.agreed_at)
            .map_err(|e| Error::new(format!("Invalid date format: {}", e)))?
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
        let row = sqlx::query_as::<_, (Uuid, Option<i32>, Option<String>, Option<String>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            "SELECT id, age, gender, handedness, created_at, updated_at FROM participants WHERE id = $1"
        )
        .bind(participant_id)
        .fetch_one(pool)
        .await?;

        Ok(Participant {
            id: ID::from(row.0.to_string()),
            age: row.1,
            gender: row.2,
            handedness: row.3,
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
            .map_err(|e| Error::new(format!("Invalid participant UUID: {}", e)))?;

        let session_id = Uuid::new_v4();
        let now = Utc::now();

        // Parse events JSON
        let events: Vec<Value> = serde_json::from_value(input.events.clone())
            .map_err(|e| Error::new(format!("Invalid events format: {}", e)))?;

        // Insert session into database
        sqlx::query(
            r#"
            INSERT INTO sessions (id, participant_id, session_index, start_ts, end_ts, events, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, participant_id, session_index, start_ts, end_ts, events, created_at, updated_at
            "#
        )
        .bind(session_id)
        .bind(participant_uuid)
        .bind(input.session_index)
        .bind(input.start_ts)
        .bind::<Option<i64>>(None)
        .bind(serde_json::json!(events))
        .bind(now)
        .bind(now)
        .execute(pool)
        .await?;

        // Fetch the created session
        let row = sqlx::query_as::<_, (Uuid, Uuid, Option<i32>, i64, Option<i64>, serde_json::Value, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            r#"
            SELECT id, participant_id, session_index, start_ts, end_ts, events, created_at, updated_at
            FROM sessions
            WHERE id = $1
            "#
        )
        .bind(session_id)
        .fetch_one(pool)
        .await?;

        Ok(Session {
            id: ID::from(row.0.to_string()),
            participant_id: ID::from(row.1.to_string()),
            session_index: row.2,
            start_ts: row.3,
            end_ts: row.4,
            events: serde_json::from_value(row.5).unwrap_or_default(),
            created_at: row.6.to_rfc3339(),
            updated_at: row.7.to_rfc3339(),
        })
    }
}

