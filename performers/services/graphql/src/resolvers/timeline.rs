// Merkle DAG: graphql.service.resolvers.timeline
// Timeline resolvers using SQLx + TimescaleDB

use async_graphql::*;
use sqlx::{Pool, Postgres, Row};
use uuid::Uuid;
use std::collections::HashMap;
use crate::types::{TimelinePoint, Session, EmotionData, WordAggregate, EmotionVector, WordStatistics, PhysiologicalData};
use crate::auth::get_auth;

#[derive(Default)]
pub struct TimelineQuery;

#[Object]
impl TimelineQuery {
    /// Get sessions for a participant
    /// - Authenticated users: get all sessions for the participant
    /// - Unauthenticated users: get sessions only for public participants (is_public = true)
    async fn sessions(
        &self,
        ctx: &Context<'_>,
        participant_id: ID,
    ) -> Result<Vec<Session>> {
        let pool = ctx.data::<Pool<Postgres>>()?;
        let participant_uuid = Uuid::parse_str(participant_id.as_str())
            .map_err(|e| Error::from(format!("Invalid UUID: {}", e)))?;
        let is_authenticated = get_auth(ctx).is_some();

        // Build query based on authentication status
        let query = if is_authenticated {
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
            WHERE s.participant_id = $1
            GROUP BY s.id, s.participant_id, s.session_index, s.start_ts, s.end_ts, s.created_at, s.updated_at
            ORDER BY s.session_index ASC
            "#
        } else {
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
            INNER JOIN participants p ON p.id = s.participant_id
            LEFT JOIN session_events se ON se.session_id = s.id
            WHERE s.participant_id = $1 AND p.is_public = true
            GROUP BY s.id, s.participant_id, s.session_index, s.start_ts, s.end_ts, s.created_at, s.updated_at
            ORDER BY s.session_index ASC
            "#
        };

        let rows = sqlx::query(query)
        .bind(participant_uuid)
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().filter_map(|row| {
            let id: Uuid = row.try_get("id").ok()?;
            let participant_id: Uuid = row.try_get("participant_id").ok()?;
            let session_index: Option<i32> = row.try_get("session_index").ok();
            let start_ts: i64 = row.try_get("start_ts").ok()?;
            let end_ts: Option<i64> = row.try_get("end_ts").ok();
            let events_json: serde_json::Value = row.try_get("events").ok().unwrap_or_else(|| serde_json::json!([]));
            let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").ok()?;
            let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").ok()?;

            Some(Session {
                id: ID::from(id.to_string()),
                participant_id: ID::from(participant_id.to_string()),
                session_index,
                start_ts,
                end_ts,
                events: serde_json::from_value(events_json).unwrap_or_default(),
                created_at: created_at.to_rfc3339(),
                updated_at: updated_at.to_rfc3339(),
            })
        }).collect())
    }

    /// Get timeline data for a participant and optional session
    /// - Authenticated users: get all timeline data for the participant
    /// - Unauthenticated users: get timeline data only for public participants (is_public = true)
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
            .map_err(|e| Error::from(format!("Invalid UUID: {}", e)))?;
        let is_authenticated = get_auth(ctx).is_some();

        let session_uuid = if let Some(sid) = session_id {
            Some(Uuid::parse_str(sid.as_str())
                .map_err(|e| Error::from(format!("Invalid UUID: {}", e)))?)
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
            let base_query = if is_authenticated {
                format!(
                    r#"
                    SELECT 
                        time_bucket('{}', tp.time) as bucket_time,
                        tp.participant_id,
                        tp.session_id,
                        AVG(tp.reaction_value) as avg_reaction_value,
                        COUNT(*) as event_count
                    FROM timeline_points tp
                    WHERE tp.participant_id = "#,
                    interval_str
                )
            } else {
                format!(
                    r#"
                    SELECT 
                        time_bucket('{}', tp.time) as bucket_time,
                        tp.participant_id,
                        tp.session_id,
                        AVG(tp.reaction_value) as avg_reaction_value,
                        COUNT(*) as event_count
                    FROM timeline_points tp
                    INNER JOIN participants p ON p.id = tp.participant_id
                    WHERE tp.participant_id = "#,
                    interval_str
                )
            };
            
            let mut query_builder = sqlx::QueryBuilder::new(base_query);
            
            query_builder.push_bind(participant_uuid);
            
            if !is_authenticated {
                query_builder.push(" AND p.is_public = true");
            }
            
            if let Some(sid) = session_uuid {
                query_builder.push(" AND tp.session_id = ");
                query_builder.push_bind(sid);
            }
            
            if let Some(st) = start_ts {
                query_builder.push(" AND tp.time >= to_timestamp(");
                query_builder.push_bind(st as i64);
                query_builder.push(" / 1000.0)");
            }
            
            query_builder.push(" GROUP BY bucket_time, tp.participant_id, tp.session_id ORDER BY bucket_time ASC LIMIT 20000");

            let rows = query_builder.build()
                .fetch_all(pool)
                .await?;

            // Convert aggregated rows to TimelinePoint
            rows.into_iter().filter_map(|row| {
                let bucket_time: chrono::DateTime<chrono::Utc> = row.try_get("bucket_time").ok()?;
                let participant_id_val: Uuid = row.try_get("participant_id").ok()?;
                let session_id_val: Uuid = row.try_get("session_id").ok()?;
                let avg_reaction_value: Option<f64> = row.try_get("avg_reaction_value").ok();
                let event_count: i64 = row.try_get("event_count").ok()?;

                Some(TimelinePoint {
                    time: bucket_time.to_rfc3339(),
                    participant_id: ID::from(participant_id_val.to_string()),
                    session_id: ID::from(session_id_val.to_string()),
                    word: None,
                    event_type: Some("aggregated".to_string()),
                    reaction_value: avg_reaction_value,
                    reaction_time: None,
                    has_response: event_count > 0,
                    emotions: Vec::new(),
                    physiological: Vec::new(),
                    metadata: serde_json::json!({}),
                })
            }).collect()
        } else {
            // Return raw timeline points - use parameterized query for better performance
            // Join with normalized emotion and physiological tables
            let base_query = if is_authenticated {
                r#"
                SELECT 
                    tp.time,
                    tp.participant_id,
                    tp.session_id,
                    tp.word,
                    tp.event_type,
                    tp.reaction_value,
                    tp.reaction_time,
                    tp.has_response,
                    COALESCE(
                        json_agg(
                            DISTINCT jsonb_build_object(
                                'name', tee.emotion_name::text,
                                'score', tee.score,
                                'fileType', tee.file_type::text,
                                'color', get_emotion_color(tee.emotion_name)::text
                            )
                        ) FILTER (WHERE tee.id IS NOT NULL),
                        '[]'::json
                    ) as emotions,
                    COALESCE(
                        json_agg(
                            jsonb_build_object(
                                'measurement_type', pm.measurement_type_id::text,
                                'value', pm.value,
                                'unit', COALESCE(pm.unit::text, 'unknown'),
                                'timestamp', tp.time::text
                            )
                        ) FILTER (WHERE pm.id IS NOT NULL),
                        '[]'::json
                    ) as physiological
                FROM timeline_points tp
                LEFT JOIN timeline_emotion_entries tee ON 
                    tee.timeline_point_time = tp.time AND
                    tee.timeline_point_participant_id = tp.participant_id AND
                    tee.timeline_point_session_id = tp.session_id
                LEFT JOIN physiological_measurements pm ON
                    pm.timeline_point_time = tp.time AND
                    pm.timeline_point_participant_id = tp.participant_id AND
                    pm.timeline_point_session_id = tp.session_id
                WHERE tp.participant_id = "#
            } else {
                r#"
                SELECT 
                    tp.time,
                    tp.participant_id,
                    tp.session_id,
                    tp.word,
                    tp.event_type,
                    tp.reaction_value,
                    tp.reaction_time,
                    tp.has_response,
                    COALESCE(
                        json_agg(
                            DISTINCT jsonb_build_object(
                                'name', tee.emotion_name::text,
                                'score', tee.score,
                                'fileType', tee.file_type::text,
                                'color', get_emotion_color(tee.emotion_name)::text
                            )
                        ) FILTER (WHERE tee.id IS NOT NULL),
                        '[]'::json
                    ) as emotions,
                    COALESCE(
                        json_agg(
                            jsonb_build_object(
                                'measurement_type', pm.measurement_type_id::text,
                                'value', pm.value,
                                'unit', COALESCE(pm.unit::text, 'unknown'),
                                'timestamp', tp.time::text
                            )
                        ) FILTER (WHERE pm.id IS NOT NULL),
                        '[]'::json
                    ) as physiological
                FROM timeline_points tp
                INNER JOIN participants p ON p.id = tp.participant_id
                LEFT JOIN timeline_emotion_entries tee ON 
                    tee.timeline_point_time = tp.time AND
                    tee.timeline_point_participant_id = tp.participant_id AND
                    tee.timeline_point_session_id = tp.session_id
                LEFT JOIN physiological_measurements pm ON
                    pm.timeline_point_time = tp.time AND
                    pm.timeline_point_participant_id = tp.participant_id AND
                    pm.timeline_point_session_id = tp.session_id
                WHERE tp.participant_id = "#
            };
            
            let mut query_builder = sqlx::QueryBuilder::new(base_query);
            
            query_builder.push_bind(participant_uuid);
            
            if !is_authenticated {
                query_builder.push(" AND p.is_public = true");
            }
            
            if let Some(sid) = session_uuid {
                query_builder.push(" AND tp.session_id = ");
                query_builder.push_bind(sid);
            }
            
            if let Some(st) = start_ts {
                query_builder.push(" AND tp.time >= to_timestamp(");
                query_builder.push_bind(st as i64);
                query_builder.push(" / 1000.0)");
                
                if let Some(et) = end_ts {
                    query_builder.push(" AND tp.time <= to_timestamp(");
                    query_builder.push_bind(et as i64);
                    query_builder.push(" / 1000.0)");
                }
            }
            
            query_builder.push(" GROUP BY tp.time, tp.participant_id, tp.session_id, tp.word, tp.event_type, tp.reaction_value, tp.reaction_time, tp.has_response ORDER BY tp.time ASC LIMIT 20000");

            let rows = query_builder.build()
                .fetch_all(pool)
                .await?;

            // Convert rows to TimelinePoint
            rows.into_iter().filter_map(|row| {
                let time: chrono::DateTime<chrono::Utc> = row.try_get("time").ok()?;
                let participant_id_val: Uuid = row.try_get("participant_id").ok()?;
                let session_id_val: Uuid = row.try_get("session_id").ok()?;
                let word: Option<String> = row.try_get("word").ok();
                let event_type: Option<String> = row.try_get("event_type").ok();
                let reaction_value: Option<f64> = row.try_get("reaction_value").ok();
                let reaction_time: Option<f64> = row.try_get("reaction_time").ok();
                let has_response: bool = row.try_get("has_response").ok().unwrap_or(false);
                let emotions_json: serde_json::Value = row.try_get("emotions").ok().unwrap_or_else(|| serde_json::json!([]));
                let physiological_json: serde_json::Value = row.try_get("physiological").ok().unwrap_or_else(|| serde_json::json!([]));
                // metadataカラムはSupabaseに存在しないため、デフォルト値を返す
                let metadata_json: serde_json::Value = serde_json::json!({});

                // Parse emotions array (already aggregated as JSON array)
                let emotions: Vec<EmotionData> = if let Some(emotions_array) = emotions_json.as_array() {
                    emotions_array.iter().filter_map(|e| {
                        Some(EmotionData {
                            name: e.get("name")?.as_str()?.to_string(),
                            score: e.get("score")?.as_f64()?,
                            file_type: e.get("fileType")?.as_str()?.to_string(),
                            color: e.get("color").and_then(|v| v.as_str()).map(|s| s.to_string()),
                        })
                    }).collect()
                } else {
                    Vec::new()
                };

                // Parse physiological data array
                let physiological: Vec<PhysiologicalData> = if let Some(phys_array) = physiological_json.as_array() {
                    phys_array.iter().filter_map(|p| {
                        Some(PhysiologicalData {
                            timestamp: p.get("timestamp").and_then(|v| v.as_str()).map(|s| s.to_string()),
                            value: p.get("value").and_then(|v| v.as_f64()),
                            metadata: p.get("metadata").cloned(),
                        })
                    }).collect()
                } else {
                    Vec::new()
                };

                Some(TimelinePoint {
                    time: time.to_rfc3339(),
                    participant_id: ID::from(participant_id_val.to_string()),
                    session_id: ID::from(session_id_val.to_string()),
                    word,
                    event_type,
                    reaction_value,
                    reaction_time,
                    has_response,
                    emotions,
                    physiological,
                    metadata: metadata_json,
                })
            }).collect()
        };

        Ok(points)
    }

    /// Get word aggregates by session (from materialized view)
    /// This provides pre-aggregated data for efficient client-side processing
    async fn word_aggregates(
        &self,
        ctx: &Context<'_>,
        participant_id: ID,
        session_id: Option<ID>,
    ) -> Result<Vec<WordAggregate>> {
        let pool = ctx.data::<Pool<Postgres>>()?;
        let participant_uuid = Uuid::parse_str(participant_id.as_str())
            .map_err(|e| Error::from(format!("Invalid UUID: {}", e)))?;

        let session_uuid = if let Some(sid) = session_id {
            Some(Uuid::parse_str(sid.as_str())
                .map_err(|e| Error::from(format!("Invalid UUID: {}", e)))?)
        } else {
            None
        };

        let mut query_builder = sqlx::QueryBuilder::new(
            r#"
            SELECT 
                participant_id,
                session_id,
                word,
                count,
                avg_reaction_value,
                sum_reaction_value,
                avg_reaction_time,
                sum_reaction_time,
                avg_physiological,
                sum_phys_abs,
                phys_series,
                rt_series,
                rv_series,
                first_time,
                last_time
            FROM timeline_word_aggregates_by_session
            WHERE participant_id = "#
        );

        query_builder.push_bind(participant_uuid);

        if let Some(sid) = session_uuid {
            query_builder.push(" AND session_id = ");
            query_builder.push_bind(sid);
        }

        query_builder.push(" ORDER BY word ASC");

        let rows = query_builder.build()
            .fetch_all(pool)
            .await?;

        let aggregates: Vec<WordAggregate> = rows.into_iter().filter_map(|row| {
            let participant_id_val: Uuid = row.try_get("participant_id").ok()?;
            let session_id_val: Uuid = row.try_get("session_id").ok()?;
            let word: String = row.try_get("word").ok()?;
            let count: i64 = row.try_get("count").ok()?;
            let avg_reaction_value: Option<f64> = row.try_get("avg_reaction_value").ok();
            let sum_reaction_value: Option<f64> = row.try_get("sum_reaction_value").ok();
            let avg_reaction_time: Option<f64> = row.try_get("avg_reaction_time").ok();
            let sum_reaction_time: Option<f64> = row.try_get("sum_reaction_time").ok();
            let avg_physiological: Option<f64> = row.try_get("avg_physiological").ok();
            let sum_phys_abs: Option<f64> = row.try_get("sum_phys_abs").ok();
            
            // Parse array columns (PostgreSQL arrays)
            // PostgreSQL arrays: try_get returns Option<T>, so we need to handle Option<Vec<Option<f64>>>
            let phys_series: Option<Vec<Option<f64>>> = match row.try_get::<Option<Vec<Option<f64>>>, _>("phys_series") {
                Ok(Some(v)) => Some(v),
                Ok(None) => None,
                Err(_) => None,
            };
            let rt_series: Option<Vec<Option<f64>>> = match row.try_get::<Option<Vec<Option<f64>>>, _>("rt_series") {
                Ok(Some(v)) => Some(v),
                Ok(None) => None,
                Err(_) => None,
            };
            let rv_series: Option<Vec<Option<f64>>> = match row.try_get::<Option<Vec<Option<f64>>>, _>("rv_series") {
                Ok(Some(v)) => Some(v),
                Ok(None) => None,
                Err(_) => None,
            };

            let first_time: chrono::DateTime<chrono::Utc> = row.try_get("first_time").ok()?;
            let last_time: chrono::DateTime<chrono::Utc> = row.try_get("last_time").ok()?;

            Some(WordAggregate {
                participant_id: ID::from(participant_id_val.to_string()),
                session_id: ID::from(session_id_val.to_string()),
                word,
                count,
                avg_reaction_value,
                sum_reaction_value,
                avg_reaction_time,
                sum_reaction_time,
                avg_physiological,
                sum_phys_abs,
                phys_series,
                rt_series,
                rv_series,
                first_time: first_time.to_rfc3339(),
                last_time: last_time.to_rfc3339(),
            })
        }).collect();

        Ok(aggregates)
    }

    /// Get emotion vectors by word (from materialized view)
    /// This provides pre-aggregated emotion data for efficient vector operations
    async fn emotion_vectors(
        &self,
        ctx: &Context<'_>,
        participant_id: ID,
        session_id: Option<ID>,
    ) -> Result<Vec<EmotionVector>> {
        let pool = ctx.data::<Pool<Postgres>>()?;
        let participant_uuid = Uuid::parse_str(participant_id.as_str())
            .map_err(|e| Error::from(format!("Invalid UUID: {}", e)))?;

        let session_uuid = if let Some(sid) = session_id {
            Some(Uuid::parse_str(sid.as_str())
                .map_err(|e| Error::from(format!("Invalid UUID: {}", e)))?)
        } else {
            None
        };

        let mut query_builder = sqlx::QueryBuilder::new(
            r#"
            SELECT 
                participant_id,
                session_id,
                word,
                joy_sum,
                sadness_sum,
                anger_sum,
                fear_sum,
                surprise_sum,
                disgust_sum,
                calm_sum,
                focus_sum,
                excitement_sum,
                confusion_sum,
                emotion_entry_count,
                emotion_by_modality
            FROM timeline_emotion_vectors_by_word
            WHERE participant_id = "#
        );

        query_builder.push_bind(participant_uuid);

        if let Some(sid) = session_uuid {
            query_builder.push(" AND session_id = ");
            query_builder.push_bind(sid);
        }

        query_builder.push(" ORDER BY word ASC");

        let rows = query_builder.build()
            .fetch_all(pool)
            .await?;

        let vectors: Vec<EmotionVector> = rows.into_iter().filter_map(|row| {
            let participant_id_val: Uuid = row.try_get("participant_id").ok()?;
            let session_id_val: Uuid = row.try_get("session_id").ok()?;
            let word: String = row.try_get("word").ok()?;
            let joy_sum: Option<f64> = row.try_get("joy_sum").ok();
            let sadness_sum: Option<f64> = row.try_get("sadness_sum").ok();
            let anger_sum: Option<f64> = row.try_get("anger_sum").ok();
            let fear_sum: Option<f64> = row.try_get("fear_sum").ok();
            let surprise_sum: Option<f64> = row.try_get("surprise_sum").ok();
            let disgust_sum: Option<f64> = row.try_get("disgust_sum").ok();
            let calm_sum: Option<f64> = row.try_get("calm_sum").ok();
            let focus_sum: Option<f64> = row.try_get("focus_sum").ok();
            let excitement_sum: Option<f64> = row.try_get("excitement_sum").ok();
            let confusion_sum: Option<f64> = row.try_get("confusion_sum").ok();
            let emotion_entry_count: i64 = row.try_get("emotion_entry_count").ok()?;
            let emotion_by_modality: Option<serde_json::Value> = row.try_get("emotion_by_modality").ok();

            Some(EmotionVector {
                participant_id: ID::from(participant_id_val.to_string()),
                session_id: ID::from(session_id_val.to_string()),
                word,
                joy_sum,
                sadness_sum,
                anger_sum,
                fear_sum,
                surprise_sum,
                disgust_sum,
                calm_sum,
                focus_sum,
                excitement_sum,
                confusion_sum,
                emotion_entry_count,
                emotion_by_modality,
            })
        }).collect();

        Ok(vectors)
    }

    /// Get word statistics by session (from materialized view)
    /// This provides pre-calculated statistics for efficient client-side processing
    async fn word_statistics(
        &self,
        ctx: &Context<'_>,
        participant_id: ID,
        session_id: Option<ID>,
    ) -> Result<Vec<WordStatistics>> {
        let pool = ctx.data::<Pool<Postgres>>()?;
        let participant_uuid = Uuid::parse_str(participant_id.as_str())
            .map_err(|e| Error::from(format!("Invalid UUID: {}", e)))?;

        let session_uuid = if let Some(sid) = session_id {
            Some(Uuid::parse_str(sid.as_str())
                .map_err(|e| Error::from(format!("Invalid UUID: {}", e)))?)
        } else {
            None
        };

        let mut query_builder = sqlx::QueryBuilder::new(
            r#"
            SELECT 
                participant_id,
                session_id,
                word,
                count,
                avg_reaction_time,
                std_reaction_time,
                var_reaction_time,
                avg_reaction_value,
                std_reaction_value,
                var_reaction_value,
                avg_physiological,
                std_physiological,
                var_physiological,
                speed_index,
                phys_series,
                rt_series
            FROM timeline_word_statistics_by_session
            WHERE participant_id = "#
        );

        query_builder.push_bind(participant_uuid);

        if let Some(sid) = session_uuid {
            query_builder.push(" AND session_id = ");
            query_builder.push_bind(sid);
        }

        query_builder.push(" ORDER BY word ASC");

        let rows = query_builder.build()
            .fetch_all(pool)
            .await?;

        let statistics: Vec<WordStatistics> = rows.into_iter().filter_map(|row| {
            let participant_id_val: Uuid = row.try_get("participant_id").ok()?;
            let session_id_val: Uuid = row.try_get("session_id").ok()?;
            let word: String = row.try_get("word").ok()?;
            let count: i64 = row.try_get("count").ok()?;
            let avg_reaction_time: Option<f64> = row.try_get("avg_reaction_time").ok();
            let std_reaction_time: Option<f64> = row.try_get("std_reaction_time").ok();
            let var_reaction_time: Option<f64> = row.try_get("var_reaction_time").ok();
            let avg_reaction_value: Option<f64> = row.try_get("avg_reaction_value").ok();
            let std_reaction_value: Option<f64> = row.try_get("std_reaction_value").ok();
            let var_reaction_value: Option<f64> = row.try_get("var_reaction_value").ok();
            let avg_physiological: Option<f64> = row.try_get("avg_physiological").ok();
            let std_physiological: Option<f64> = row.try_get("std_physiological").ok();
            let var_physiological: Option<f64> = row.try_get("var_physiological").ok();
            let speed_index: Option<f64> = row.try_get("speed_index").ok();
            
            // Parse array columns (PostgreSQL arrays)
            // PostgreSQL arrays: try_get returns Option<T>, so we need to handle Option<Vec<Option<f64>>>
            let phys_series: Option<Vec<Option<f64>>> = match row.try_get::<Option<Vec<Option<f64>>>, _>("phys_series") {
                Ok(Some(v)) => Some(v),
                Ok(None) => None,
                Err(_) => None,
            };
            let rt_series: Option<Vec<Option<f64>>> = match row.try_get::<Option<Vec<Option<f64>>>, _>("rt_series") {
                Ok(Some(v)) => Some(v),
                Ok(None) => None,
                Err(_) => None,
            };

            Some(WordStatistics {
                participant_id: ID::from(participant_id_val.to_string()),
                session_id: ID::from(session_id_val.to_string()),
                word,
                count,
                avg_reaction_time,
                std_reaction_time,
                var_reaction_time,
                avg_reaction_value,
                std_reaction_value,
                var_reaction_value,
                avg_physiological,
                std_physiological,
                var_physiological,
                speed_index,
                phys_series,
                rt_series,
            })
        }).collect();

        Ok(statistics)
    }
}
