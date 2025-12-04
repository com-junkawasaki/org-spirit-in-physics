// Merkle DAG: grpc.service.services.participants
// Participant gRPC service implementation

use tonic::{Request, Response, Status};
use sqlx::{Pool, Postgres, Row};
use uuid::Uuid;
use crate::auth::interceptor::extract_auth_context;
use crate::error::{from_sqlx_error, from_uuid_parse_error, from_chrono_parse_error};

// Generated proto types (will be available after build)
// use spirit_in_physics::participants::v1::{
//     participant_service_server::ParticipantService,
//     GetParticipantsRequest, GetParticipantsResponse,
//     GetParticipantRequest, GetParticipantResponse,
//     CreateParticipantRequest, CreateParticipantResponse,
//     Participant,
// };

// Temporary placeholder - will be replaced with generated types
pub mod proto {
    pub mod participants {
        pub mod v1 {
            pub mod participant_service_server {
                use tonic::Request;
                pub trait ParticipantService: Send + Sync + 'static {
                    async fn get_participants(
                        &self,
                        request: Request<super::super::GetParticipantsRequest>,
                    ) -> Result<tonic::Response<super::super::GetParticipantsResponse>, tonic::Status>;
                    
                    async fn get_participant(
                        &self,
                        request: Request<super::super::GetParticipantRequest>,
                    ) -> Result<tonic::Response<super::super::GetParticipantResponse>, tonic::Status>;
                    
                    async fn create_participant(
                        &self,
                        request: Request<super::super::CreateParticipantRequest>,
                    ) -> Result<tonic::Response<super::super::CreateParticipantResponse>, tonic::Status>;
                }
            }
            
            pub struct GetParticipantsRequest {}
            pub struct GetParticipantsResponse {
                pub participants: Vec<Participant>,
            }
            
            pub struct GetParticipantRequest {
                pub id: String,
            }
            
            pub struct GetParticipantResponse {
                pub participant: Option<Participant>,
            }
            
            pub struct CreateParticipantRequest {
                pub id: Option<String>,
                pub signature: String,
                pub agreements: crate::services::common::common::v1::JsonValue,
                pub agreed_at: String,
                pub is_public: Option<bool>,
            }
            
            pub struct CreateParticipantResponse {
                pub participant: Participant,
            }
            
            pub struct Participant {
                pub id: String,
                pub age: Option<i32>,
                pub gender: Option<String>,
                pub handedness: Option<String>,
                pub is_public: bool,
                pub created_at: String,
                pub updated_at: String,
            }
        }
    }
}

use proto::participants::v1::participant_service_server::ParticipantService as ParticipantServiceTrait;
use proto::participants::v1::*;

pub struct ParticipantServiceImpl {
    pool: Pool<Postgres>,
}

impl ParticipantServiceImpl {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }
}

#[tonic::async_trait]
impl ParticipantServiceTrait for ParticipantServiceImpl {
    async fn get_participants(
        &self,
        request: Request<GetParticipantsRequest>,
    ) -> Result<Response<GetParticipantsResponse>, Status> {
        let auth_context = extract_auth_context(&request.map(|_| ())).await?;
        let is_authenticated = auth_context.is_some();
        
        let query = if is_authenticated {
            "SELECT id, age, gender, handedness, is_public, created_at, updated_at FROM participants ORDER BY created_at DESC"
        } else {
            "SELECT id, age, gender, handedness, is_public, created_at, updated_at FROM participants WHERE is_public = true ORDER BY created_at DESC"
        };
        
        // Use sqlx::Row to handle ENUM types properly
        let rows = sqlx::query(query)
            .fetch_all(&self.pool)
            .await
            .map_err(from_sqlx_error)?;

        let participants = rows.into_iter().map(|row| {
            let id: Uuid = row.get("id");
            let age: Option<i32> = row.get("age");
            let gender: Option<String> = row.get("gender");
            let handedness: Option<String> = row.try_get::<Option<String>, _>("handedness")
                .ok()
                .flatten()
                .or_else(|| {
                    // Try to get as ENUM and convert to string
                    row.try_get::<Option<String>, _>("handedness")
                        .ok()
                        .flatten()
                });
            let is_public: bool = row.get("is_public");
            let created_at: chrono::DateTime<chrono::Utc> = row.get("created_at");
            let updated_at: chrono::DateTime<chrono::Utc> = row.get("updated_at");
            
            Participant {
                id: id.to_string(),
                age,
                gender,
                handedness,
                is_public,
                created_at: created_at.to_rfc3339(),
                updated_at: updated_at.to_rfc3339(),
            }
        }).collect();

        Ok(Response::new(GetParticipantsResponse { participants }))
    }

    async fn get_participant(
        &self,
        request: Request<GetParticipantRequest>,
    ) -> Result<Response<GetParticipantResponse>, Status> {
        let auth_context = extract_auth_context(&request.map(|_| ())).await?;
        let is_authenticated = auth_context.is_some();
        
        let uuid = Uuid::parse_str(&request.get_ref().id)
            .map_err(from_uuid_parse_error)?;

        let query = if is_authenticated {
            "SELECT id, age, gender, handedness, is_public, created_at, updated_at FROM participants WHERE id = $1"
        } else {
            "SELECT id, age, gender, handedness, is_public, created_at, updated_at FROM participants WHERE id = $1 AND is_public = true"
        };

        let row = sqlx::query(query)
            .bind(uuid)
            .fetch_optional(&self.pool)
            .await
            .map_err(from_sqlx_error)?;

        let participant = row.map(|row| {
            let id: Uuid = row.get("id");
            let age: Option<i32> = row.get("age");
            let gender: Option<String> = row.get("gender");
            let handedness: Option<String> = row.try_get::<Option<String>, _>("handedness")
                .ok()
                .flatten();
            let is_public: bool = row.get("is_public");
            let created_at: chrono::DateTime<chrono::Utc> = row.get("created_at");
            let updated_at: chrono::DateTime<chrono::Utc> = row.get("updated_at");
            
            Participant {
                id: id.to_string(),
                age,
                gender,
                handedness,
                is_public,
                created_at: created_at.to_rfc3339(),
                updated_at: updated_at.to_rfc3339(),
            }
        });

        Ok(Response::new(GetParticipantResponse { participant }))
    }

    async fn create_participant(
        &self,
        request: Request<CreateParticipantRequest>,
    ) -> Result<Response<CreateParticipantResponse>, Status> {
        let req = request.get_ref();
        
        let participant_id = if let Some(id) = &req.id {
            Uuid::parse_str(id)
                .map_err(from_uuid_parse_error)?
        } else {
            Uuid::new_v4()
        };

        let agreed_at = chrono::DateTime::parse_from_rfc3339(&req.agreed_at)
            .map_err(from_chrono_parse_error)?
            .with_timezone(&chrono::Utc);

        let is_public = req.is_public.unwrap_or(true);

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
        .bind(chrono::Utc::now())
        .execute(&self.pool)
        .await
        .map_err(from_sqlx_error)?;

        let row = sqlx::query(
            "SELECT id, age, gender, handedness, is_public, created_at, updated_at FROM participants WHERE id = $1"
        )
        .bind(participant_id)
        .fetch_one(&self.pool)
        .await
        .map_err(from_sqlx_error)?;

        let id: Uuid = row.get("id");
        let age: Option<i32> = row.get("age");
        let gender: Option<String> = row.get("gender");
        let handedness: Option<String> = row.try_get::<Option<String>, _>("handedness")
            .ok()
            .flatten();
        let is_public: bool = row.get("is_public");
        let created_at: chrono::DateTime<chrono::Utc> = row.get("created_at");
        let updated_at: chrono::DateTime<chrono::Utc> = row.get("updated_at");

        let participant = Participant {
            id: id.to_string(),
            age,
            gender,
            handedness,
            is_public,
            created_at: created_at.to_rfc3339(),
            updated_at: updated_at.to_rfc3339(),
        };

        Ok(Response::new(CreateParticipantResponse { participant }))
    }
}

