// Merkle DAG: graphql.service.resolvers.participant
// Participant resolvers using SQLx

use juniper::FieldError;
use sqlx::{PgPool, Pool, Postgres};
use uuid::Uuid;
use crate::schema::{Context, Participant, StimulusWord};
use crate::auth::{require_auth, get_auth};

pub struct ParticipantQuery;

impl ParticipantQuery {
    /// Get all participants
    /// - Authenticated users: get all participants
    /// - Unauthenticated users: get only public participants (is_public = true)
    pub async fn participants(ctx: &Context) -> Result<Vec<Participant>, FieldError> {
        let pool = &ctx.pool;
        let is_authenticated = get_auth(ctx).is_some();
        
        // Build query based on authentication status
        let query = if is_authenticated {
            "SELECT id, age, gender, handedness, is_public, created_at, updated_at FROM participants ORDER BY created_at DESC"
        } else {
            "SELECT id, age, gender, handedness, is_public, created_at, updated_at FROM participants WHERE is_public = true ORDER BY created_at DESC"
        };
        
        let rows = sqlx::query_as::<_, (Uuid, Option<i32>, Option<String>, Option<crate::types::HandednessType>, bool, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            query
        )
        .fetch_all(pool)
        .await
        .map_err(|e| FieldError::new(format!("Database error: {}", e), juniper::Value::Null))?;

        Ok(rows.into_iter().map(|(id, age, gender, handedness, is_public, created_at, updated_at)| {
            Participant {
                id: juniper::ID::from(id.to_string()),
                age,
                gender,
                handedness: handedness.map(|h| h.to_string()),
                is_public,
                created_at: created_at.to_rfc3339(),
                updated_at: updated_at.to_rfc3339(),
            }
        }).collect())
    }

    /// Get a participant by ID
    /// - Authenticated users: can get any participant
    /// - Unauthenticated users: can only get public participants (is_public = true)
    pub async fn participant(ctx: &Context, id: juniper::ID) -> Result<Option<Participant>, FieldError> {
        let pool = &ctx.pool;
        let uuid = Uuid::parse_str(id.to_string().as_str())
            .map_err(|e| FieldError::new(format!("Invalid UUID: {}", e), juniper::Value::Null))?;
        let is_authenticated = get_auth(ctx).is_some();

        // Build query based on authentication status
        let query = if is_authenticated {
            "SELECT id, age, gender, handedness, is_public, created_at, updated_at FROM participants WHERE id = $1"
        } else {
            "SELECT id, age, gender, handedness, is_public, created_at, updated_at FROM participants WHERE id = $1 AND is_public = true"
        };

        let row = sqlx::query_as::<_, (Uuid, Option<i32>, Option<String>, Option<crate::types::HandednessType>, bool, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            query
        )
        .bind(uuid)
        .fetch_optional(pool)
        .await
        .map_err(|e| FieldError::new(format!("Database error: {}", e), juniper::Value::Null))?;

        Ok(row.map(|(id, age, gender, handedness, is_public, created_at, updated_at)| {
            Participant {
                id: juniper::ID::from(id.to_string()),
                age,
                gender,
                handedness: handedness.map(|h| h.to_string()),
                is_public,
                created_at: created_at.to_rfc3339(),
                updated_at: updated_at.to_rfc3339(),
            }
        }))
    }

    /// Get all stimulus words for Jung word association test
    pub async fn stimulus_words(ctx: &Context) -> Result<Vec<StimulusWord>, FieldError> {
        let pool = &ctx.pool;
        
        let rows = sqlx::query_as::<_, (i32, String, String, String)>(
            "SELECT id, japanese, english, pronunciation FROM stimulus_words ORDER BY id"
        )
        .fetch_all(pool)
        .await
        .map_err(|e| FieldError::new(format!("Database error: {}", e), juniper::Value::Null))?;

        Ok(rows.into_iter().map(|(id, japanese, english, pronunciation)| {
            StimulusWord {
                id,
                japanese,
                english,
                pronunciation,
            }
        }).collect())
    }

    /// Get a stimulus word by ID
    pub async fn stimulus_word(ctx: &Context, id: i32) -> Result<Option<StimulusWord>, FieldError> {
        let pool = &ctx.pool;

        let row = sqlx::query_as::<_, (i32, String, String, String)>(
            "SELECT id, japanese, english, pronunciation FROM stimulus_words WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(|e| FieldError::new(format!("Database error: {}", e), juniper::Value::Null))?;

        Ok(row.map(|(id, japanese, english, pronunciation)| {
            StimulusWord {
                id,
                japanese,
                english,
                pronunciation,
            }
        }))
    }
}
