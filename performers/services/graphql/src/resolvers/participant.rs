// Merkle DAG: graphql.service.resolvers.participant
// Participant resolvers using SQLx

use async_graphql::*;
use sqlx::{PgPool, Pool, Postgres};
use uuid::Uuid;
use crate::types::Participant;

#[derive(Default)]
pub struct ParticipantQuery;

#[Object]
impl ParticipantQuery {
    /// Get all participants
    async fn participants(&self, ctx: &Context<'_>) -> Result<Vec<Participant>> {
        let pool = ctx.data::<Pool<Postgres>>()?;
        
        let rows = sqlx::query_as::<_, (Uuid, Option<i32>, Option<String>, Option<crate::types::HandednessType>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            "SELECT id, age, gender, handedness, created_at, updated_at FROM participants ORDER BY created_at DESC"
        )
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(|(id, age, gender, handedness, created_at, updated_at)| {
            Participant {
                id: ID::from(id.to_string()),
                age,
                gender,
                handedness: handedness.map(|h| h.to_string()),
                created_at: created_at.to_rfc3339(),
                updated_at: updated_at.to_rfc3339(),
            }
        }).collect())
    }

    /// Get a participant by ID
    async fn participant(&self, ctx: &Context<'_>, id: ID) -> Result<Option<Participant>> {
        let pool = ctx.data::<Pool<Postgres>>()?;
        let uuid = Uuid::parse_str(id.as_str())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;

        let row = sqlx::query_as::<_, (Uuid, Option<i32>, Option<String>, Option<crate::types::HandednessType>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            "SELECT id, age, gender, handedness, created_at, updated_at FROM participants WHERE id = $1"
        )
        .bind(uuid)
        .fetch_optional(pool)
        .await?;

        Ok(row.map(|(id, age, gender, handedness, created_at, updated_at)| {
            Participant {
                id: ID::from(id.to_string()),
                age,
                gender,
                handedness: handedness.map(|h| h.to_string()),
                created_at: created_at.to_rfc3339(),
                updated_at: updated_at.to_rfc3339(),
            }
        }))
    }
}

