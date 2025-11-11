// Merkle DAG: graphql.service.resolvers.timeline
// Timeline resolvers using SQLx + TimescaleDB

use async_graphql::*;
use sqlx::{Pool, Postgres};
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

        // Build query based on whether aggregation is requested
        let points = if let Some(interval_str) = interval {
            // Use TimescaleDB time_bucket for aggregation
            let query = format!(
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
                LIMIT 10000
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
            );

            let rows = sqlx::query(&query)
                .bind(participant_uuid)
                .fetch_all(pool)
                .await?;

            // Convert aggregated rows to TimelinePoint
            rows.into_iter().map(|row| {
                let bucket_time: chrono::DateTime<chrono::Utc> = row.get("bucket_time");
                let participant_id_val: Uuid = row.get("participant_id");
                let session_id_val: Uuid = row.get("session_id");
                let avg_reaction_value: Option<f64> = row.get("avg_reaction_value");
                let event_count: i64 = row.get("event_count");

                TimelinePoint {
                    time: bucket_time.to_rfc3339(),
                    participant_id: ID::from(participant_id_val.to_string()),
                    session_id: ID::from(session_id_val.to_string()),
                    word: None,
                    event_type: Some("aggregated".to_string()),
                    reaction_value: avg_reaction_value,
                    reaction_time: None,
                    has_response: event_count > 0,
                    emotions: Vec::new(),
                    physiological: serde_json::json!({}),
                    metadata: serde_json::json!({ "event_count": event_count }),
                }
            }).collect()
        } else {
            // Return raw timeline points
            let mut query = String::from(
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
                "#
            );

            if let Some(sid) = session_uuid {
                query.push_str(&format!(" AND session_id = '{}'", sid));
            }

            if let Some(st) = start_ts {
                if let Some(et) = end_ts {
                    query.push_str(&format!(" AND time >= to_timestamp({} / 1000.0) AND time <= to_timestamp({} / 1000.0)", st, et));
                } else {
                    query.push_str(&format!(" AND time >= to_timestamp({} / 1000.0)", st));
                }
            }

            query.push_str(" ORDER BY time ASC LIMIT 10000");

            let rows = sqlx::query(&query)
                .bind(participant_uuid)
                .fetch_all(pool)
                .await?;

            // Convert rows to TimelinePoint
            rows.into_iter().map(|row| {
                let time: chrono::DateTime<chrono::Utc> = row.get("time");
                let participant_id_val: Uuid = row.get("participant_id");
                let session_id_val: Uuid = row.get("session_id");
                let word: Option<String> = row.get("word");
                let event_type: Option<String> = row.get("event_type");
                let reaction_value: Option<f64> = row.get("reaction_value");
                let reaction_time: Option<f64> = row.get("reaction_time");
                let has_response: bool = row.get("has_response");
                let emotions_json: serde_json::Value = row.get("emotions");
                let physiological_json: serde_json::Value = row.get("physiological");
                let metadata_json: serde_json::Value = row.get("metadata");

                // Parse emotions array
                let emotions: Vec<EmotionData> = if let Some(emotions_array) = emotions_json.as_array() {
                    emotions_array.iter().filter_map(|e| {
                        Some(EmotionData {
                            name: e.get("name")?.as_str()?.to_string(),
                            score: e.get("score")?.as_f64()?,
                            file_type: e.get("fileType")?.as_str()?.to_string(),
                        })
                    }).collect()
                } else {
                    Vec::new()
                };

                TimelinePoint {
                    time: time.to_rfc3339(),
                    participant_id: ID::from(participant_id_val.to_string()),
                    session_id: ID::from(session_id_val.to_string()),
                    word,
                    event_type,
                    reaction_value,
                    reaction_time,
                    has_response,
                    emotions,
                    physiological: physiological_json,
                    metadata: metadata_json,
                }
            }).collect()
        };

        Ok(points)
    }
}
