// Merkle DAG: grpc.service.services.sessions
// Session gRPC service implementation

use tonic::{Request, Response, Status};
use sqlx::{Pool, Postgres, Row};
use uuid::Uuid;
use crate::auth::interceptor::extract_auth_context;
use crate::error::{from_sqlx_error, from_uuid_parse_error, from_json_error};

// Temporary placeholder - will be replaced with generated types
pub mod proto {
    pub mod sessions {
        pub mod v1 {
            pub mod session_service_server {
                use tonic::Request;
                pub trait SessionService: Send + Sync + 'static {
                    async fn get_sessions(
                        &self,
                        request: Request<super::super::GetSessionsRequest>,
                    ) -> Result<tonic::Response<super::super::GetSessionsResponse>, tonic::Status>;
                    
                    async fn create_session(
                        &self,
                        request: Request<super::super::CreateSessionRequest>,
                    ) -> Result<tonic::Response<super::super::CreateSessionResponse>, tonic::Status>;
                }
            }
            
            pub struct GetSessionsRequest {
                pub participant_id: String,
            }
            
            pub struct GetSessionsResponse {
                pub sessions: Vec<Session>,
            }
            
            pub struct CreateSessionRequest {
                pub participant_id: String,
                pub session_index: Option<i32>,
                pub start_ts: i64,
                pub events: crate::services::common::common::v1::JsonValue,
            }
            
            pub struct CreateSessionResponse {
                pub session: Session,
            }
            
            pub struct Session {
                pub id: String,
                pub participant_id: String,
                pub session_index: Option<i32>,
                pub start_ts: i64,
                pub end_ts: Option<i64>,
                pub events: Vec<crate::services::common::common::v1::JsonValue>,
                pub created_at: String,
                pub updated_at: String,
            }
        }
    }
}

use proto::sessions::v1::session_service_server::SessionService as SessionServiceTrait;
use proto::sessions::v1::*;

pub struct SessionServiceImpl {
    pool: Pool<Postgres>,
}

impl SessionServiceImpl {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }
}

#[tonic::async_trait]
impl SessionServiceTrait for SessionServiceImpl {
    async fn get_sessions(
        &self,
        request: Request<GetSessionsRequest>,
    ) -> Result<Response<GetSessionsResponse>, Status> {
        let auth_context = extract_auth_context(&request.map(|_| ())).await?;
        let is_authenticated = auth_context.is_some();
        
        let participant_uuid = Uuid::parse_str(&request.get_ref().participant_id)
            .map_err(from_uuid_parse_error)?;

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
            .fetch_all(&self.pool)
            .await
            .map_err(from_sqlx_error)?;

        let sessions: Vec<Session> = rows.into_iter().filter_map(|row| {
            let id: Uuid = row.try_get("id").ok()?;
            let participant_id: Uuid = row.try_get("participant_id").ok()?;
            let session_index: Option<i32> = row.try_get("session_index").ok();
            let start_ts: i64 = row.try_get("start_ts").ok()?;
            let end_ts: Option<i64> = row.try_get("end_ts").ok();
            let events_json: serde_json::Value = row.try_get("events").ok().unwrap_or_else(|| serde_json::json!([]));
            let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").ok()?;
            let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").ok()?;

            let events: Vec<serde_json::Value> = serde_json::from_value(events_json).ok()?;
            let events_proto: Vec<crate::services::common::common::v1::JsonValue> = events.into_iter().map(|e| {
                crate::services::common::common::v1::JsonValue {
                    value: serde_json::to_string(&e).unwrap_or_default(),
                }
            }).collect();

            Some(Session {
                id: id.to_string(),
                participant_id: participant_id.to_string(),
                session_index,
                start_ts,
                end_ts,
                events: events_proto,
                created_at: created_at.to_rfc3339(),
                updated_at: updated_at.to_rfc3339(),
            })
        }).collect();

        Ok(Response::new(GetSessionsResponse { sessions }))
    }

    async fn create_session(
        &self,
        request: Request<CreateSessionRequest>,
    ) -> Result<Response<CreateSessionResponse>, Status> {
        let req = request.get_ref();
        
        let participant_uuid = Uuid::parse_str(&req.participant_id)
            .map_err(from_uuid_parse_error)?;

        let session_id = Uuid::new_v4();
        let now = chrono::Utc::now();

        // Parse events JSON
        let events_json: serde_json::Value = serde_json::from_str(&req.events.value)
            .map_err(from_json_error)?;
        let events: Vec<serde_json::Value> = serde_json::from_value(events_json)
            .map_err(from_json_error)?;

        // Insert session
        sqlx::query(
            r#"
            INSERT INTO sessions (id, participant_id, session_index, start_ts, end_ts, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#
        )
        .bind(session_id)
        .bind(participant_uuid)
        .bind(req.session_index)
        .bind(req.start_ts)
        .bind::<Option<i64>>(None)
        .bind(now)
        .bind(now)
        .execute(&self.pool)
        .await
        .map_err(from_sqlx_error)?;

        // Insert events
        for event in events {
            let event_type_str = event.get("type")
                .and_then(|v| v.as_str())
                .ok_or_else(|| Status::invalid_argument("Event missing 'type' field"))?;
            
            let event_timestamp = event.get("timestamp")
                .and_then(|v| v.as_i64())
                .unwrap_or(req.start_ts);
            
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
            .execute(&self.pool)
            .await
            .map_err(from_sqlx_error)?;
        }

        // Fetch created session
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
        .fetch_one(&self.pool)
        .await
        .map_err(from_sqlx_error)?;

        let id: Uuid = row.try_get("id").map_err(|e| Status::internal(format!("Failed to get id: {}", e)))?;
        let participant_id: Uuid = row.try_get("participant_id").map_err(|e| Status::internal(format!("Failed to get participant_id: {}", e)))?;
        let session_index: Option<i32> = row.try_get("session_index").ok();
        let start_ts: i64 = row.try_get("start_ts").map_err(|e| Status::internal(format!("Failed to get start_ts: {}", e)))?;
        let end_ts: Option<i64> = row.try_get("end_ts").ok();
        let events_json: serde_json::Value = row.try_get("events").ok().unwrap_or_else(|| serde_json::json!([]));
        let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| Status::internal(format!("Failed to get created_at: {}", e)))?;
        let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").map_err(|e| Status::internal(format!("Failed to get updated_at: {}", e)))?;

        let events: Vec<serde_json::Value> = serde_json::from_value(events_json)
            .map_err(from_json_error)?;
        let events_proto: Vec<crate::services::common::common::v1::JsonValue> = events.into_iter().map(|e| {
            crate::services::common::common::v1::JsonValue {
                value: serde_json::to_string(&e).unwrap_or_default(),
            }
        }).collect();

        let session = Session {
            id: id.to_string(),
            participant_id: participant_id.to_string(),
            session_index,
            start_ts,
            end_ts,
            events: events_proto,
            created_at: created_at.to_rfc3339(),
            updated_at: updated_at.to_rfc3339(),
        };

        Ok(Response::new(CreateSessionResponse { session }))
    }
}

