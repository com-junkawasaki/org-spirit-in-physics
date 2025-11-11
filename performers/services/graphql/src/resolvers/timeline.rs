// Merkle DAG: graphql.service.resolvers.timeline
// Timeline resolvers using SQLx + TimescaleDB

use async_graphql::*;
use sqlx::{PgPool, Pool, Postgres};
use uuid::Uuid;
use crate::types::{TimelinePoint, Session, EmotionData};

pub struct TimelineQuery;

#[Object]
impl TimelineQuery {
    /// Get sessions for a participant
    async fn sessions(
        &self,
        ctx: &Context<'_>,
        participant_id: ID,
    ) -> Result<Vec<Session>> {
        let pool = ctx.data::<Pool<Postgres>>()?;
        let participant_uuid = Uuid::parse_str(participant_id.as_str())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;

        let rows = sqlx::query_as::<_, (Uuid, Uuid, Option<i32>, i64, Option<i64>, serde_json::Value, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            r#"
            SELECT id, participant_id, session_index, start_ts, end_ts, events, created_at, updated_at
            FROM sessions
            WHERE participant_id = $1
            ORDER BY session_index ASC
            "#
        )
        .bind(participant_uuid)
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(|(id, participant_id, session_index, start_ts, end_ts, events, created_at, updated_at)| {
            Session {
                id: ID::from(id.to_string()),
                participant_id: ID::from(participant_id.to_string()),
                session_index,
                start_ts,
                end_ts,
                events: serde_json::from_value(events).unwrap_or_default(),
                created_at: created_at.to_rfc3339(),
                updated_at: updated_at.to_rfc3339(),
            }
        }).collect())
    }

    /// Get timeline data for a participant and optional session
    async fn timeline(
        &self,
        ctx: &Context<'_>,
        participant_id: ID,
        session_id: Option<ID>,
        start_time: Option<String>,
        end_time: Option<String>,
        interval: Option<String>, // e.g., "1 hour", "1 day"
    ) -> Result<Vec<TimelinePoint>> {
        let pool = ctx.data::<Pool<Postgres>>()?;
        let participant_uuid = Uuid::parse_str(participant_id.as_str())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;

        let session_uuid = if let Some(sid) = session_id {
            Some(Uuid::parse_str(sid.as_str())
                .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?)
        } else {
            None
        };

        // Parse time range
        let start_ts = start_time
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
            .map(|dt| dt.timestamp_millis());
        let end_ts = end_time
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
            .map(|dt| dt.timestamp_millis());

        // Build query
        let query = if let Some(interval_str) = interval {
            // Use TimescaleDB time_bucket for aggregation
            format!(
                r#"
                SELECT 
                    time_bucket('{}', time) as bucket_time,
                    participant_id,
                    session_id,
                    AVG(reaction_value) as avg_reaction_value,
                    COUNT(*) as event_count
                FROM timeline_points
                WHERE participant_id = $1
                    {}
                    {}
                GROUP BY bucket_time, participant_id, session_id
                ORDER BY bucket_time ASC
                "#,
                interval_str,
                if let Some(sid) = session_uuid {
                    format!("AND session_id = '{}'", sid)
                } else {
                    String::new()
                },
                if let Some(st) = start_ts {
                    format!("AND time >= to_timestamp({} / 1000.0)", st)
                } else {
                    String::new()
                }
            )
        } else {
            // Return raw timeline points
            format!(
                r#"
                SELECT 
                    time,
                    participant_id,
                    session_id,
                    word,
                    event_type,
                    reaction_value,
                    reaction_time,
                    has_response,
                    emotions,
                    physiological,
                    metadata
                FROM timeline_points
                WHERE participant_id = $1
                    {}
                    {}
                ORDER BY time ASC
                LIMIT 10000
                "#,
                if let Some(sid) = session_uuid {
                    format!("AND session_id = '{}'", sid)
                } else {
                    String::new()
                },
                if let Some(st) = start_ts {
                    if let Some(et) = end_ts {
                        format!("AND time >= to_timestamp({} / 1000.0) AND time <= to_timestamp({} / 1000.0)", st, et)
                    } else {
                        format!("AND time >= to_timestamp({} / 1000.0)", st)
                    }
                } else {
                    String::new()
                }
            )
        };

        // Execute query (simplified - actual implementation needs proper type mapping)
        let rows = sqlx::query(&query)
            .bind(participant_uuid)
            .fetch_all(pool)
            .await?;

        // Convert rows to TimelinePoint (simplified - needs proper mapping)
        let mut points = Vec::new();
        for row in rows {
            // Extract data from row (simplified - actual implementation needs proper column access)
            // This is a placeholder - actual implementation should use sqlx::FromRow
            points.push(TimelinePoint {
                time: chrono::Utc::now().to_rfc3339(), // Placeholder
                participant_id: participant_id.clone(),
                session_id: session_id.clone().unwrap_or_else(|| ID::from("")),
                word: None,
                event_type: None,
                reaction_value: None,
                reaction_time: None,
                has_response: false,
                emotions: Vec::new(),
                physiological: serde_json::json!({}),
                metadata: serde_json::json!({}),
            });
        }

        Ok(points)
    }
}

