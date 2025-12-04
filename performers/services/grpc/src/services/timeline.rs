// Merkle DAG: grpc.service.services.timeline
// Timeline gRPC service implementation

use tonic::{Request, Response, Status};
use sqlx::{Pool, Postgres, Row};
use uuid::Uuid;
use crate::auth::interceptor::extract_auth_context;
use crate::error::{from_sqlx_error, from_uuid_parse_error};

// Generated proto types
use crate::generated::timeline::v1::{
    timeline_service_server::TimelineService,
    GetTimelineRequest, GetTimelineResponse,
    GetWordAggregatesRequest, GetWordAggregatesResponse,
    GetEmotionVectorsRequest, GetEmotionVectorsResponse,
    GetWordStatisticsRequest, GetWordStatisticsResponse,
    TimelinePoint, EmotionData, PhysiologicalData,
    WordAggregate, EmotionVector, WordStatistics,
};
use crate::generated::common::v1::JsonValue;

pub struct TimelineServiceImpl {
    pool: Pool<Postgres>,
}

impl TimelineServiceImpl {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }
}

#[tonic::async_trait]
impl TimelineService for TimelineServiceImpl {
    async fn get_timeline(
        &self,
        request: Request<GetTimelineRequest>,
    ) -> Result<Response<GetTimelineResponse>, Status> {
        // Simplified implementation - full version will follow GraphQL resolver
        let _req = request.get_ref();
        // TODO: Implement full timeline query logic from GraphQL resolver
        Ok(Response::new(GetTimelineResponse { points: vec![] }))
    }

    async fn get_word_aggregates(
        &self,
        request: Request<GetWordAggregatesRequest>,
    ) -> Result<Response<GetWordAggregatesResponse>, Status> {
        let req = request.get_ref();
        let participant_uuid = Uuid::parse_str(&req.participant_id)
            .map_err(from_uuid_parse_error)?;
        
        let mut query = sqlx::QueryBuilder::new(
            "SELECT * FROM timeline_word_aggregates_by_session WHERE participant_id = "
        );
        query.push_bind(participant_uuid);
        
        if let Some(session_id) = &req.session_id {
            let session_uuid = Uuid::parse_str(session_id)
                .map_err(from_uuid_parse_error)?;
            query.push(" AND session_id = ");
            query.push_bind(session_uuid);
        }
        
        let rows = query.build()
            .fetch_all(&self.pool)
            .await
            .map_err(from_sqlx_error)?;

        let aggregates: Vec<WordAggregate> = rows.into_iter().filter_map(|row| {
            Some(WordAggregate {
                participant_id: row.try_get::<Uuid, _>("participant_id").ok()?.to_string(),
                session_id: row.try_get::<Uuid, _>("session_id").ok()?.to_string(),
                word: row.try_get("word").ok()?,
                count: row.try_get("count").ok()?,
                avg_reaction_value: row.try_get("avg_reaction_value").ok(),
                sum_reaction_value: row.try_get("sum_reaction_value").ok(),
                avg_reaction_time: row.try_get("avg_reaction_time").ok(),
                sum_reaction_time: row.try_get("sum_reaction_time").ok(),
                avg_physiological: row.try_get("avg_physiological").ok(),
                sum_phys_abs: row.try_get("sum_phys_abs").ok(),
                phys_series: row.try_get::<Option<Vec<Option<f64>>>, _>("phys_series").ok()?
                    .unwrap_or_default()
                    .into_iter()
                    .flatten()
                    .collect(),
                rt_series: row.try_get::<Option<Vec<Option<f64>>>, _>("rt_series").ok()?
                    .unwrap_or_default()
                    .into_iter()
                    .flatten()
                    .collect(),
                rv_series: row.try_get::<Option<Vec<Option<f64>>>, _>("rv_series").ok()?
                    .unwrap_or_default()
                    .into_iter()
                    .flatten()
                    .collect(),
                first_time: row.try_get::<chrono::DateTime<chrono::Utc>, _>("first_time").ok()?.to_rfc3339(),
                last_time: row.try_get::<chrono::DateTime<chrono::Utc>, _>("last_time").ok()?.to_rfc3339(),
            })
        }).collect();

        Ok(Response::new(GetWordAggregatesResponse { aggregates }))
    }

    async fn get_emotion_vectors(
        &self,
        request: Request<GetEmotionVectorsRequest>,
    ) -> Result<Response<GetEmotionVectorsResponse>, Status> {
        let req = request.get_ref();
        let participant_uuid = Uuid::parse_str(&req.participant_id)
            .map_err(from_uuid_parse_error)?;
        
        let mut query = sqlx::QueryBuilder::new(
            "SELECT * FROM timeline_emotion_vectors_by_word WHERE participant_id = "
        );
        query.push_bind(participant_uuid);
        
        if let Some(session_id) = &req.session_id {
            let session_uuid = Uuid::parse_str(session_id)
                .map_err(from_uuid_parse_error)?;
            query.push(" AND session_id = ");
            query.push_bind(session_uuid);
        }
        
        let rows = query.build()
            .fetch_all(&self.pool)
            .await
            .map_err(from_sqlx_error)?;

        let vectors: Vec<EmotionVector> = rows.into_iter().filter_map(|row| {
            Some(EmotionVector {
                participant_id: row.try_get::<Uuid, _>("participant_id").ok()?.to_string(),
                session_id: row.try_get::<Uuid, _>("session_id").ok()?.to_string(),
                word: row.try_get("word").ok()?,
                joy_sum: row.try_get("joy_sum").ok(),
                sadness_sum: row.try_get("sadness_sum").ok(),
                anger_sum: row.try_get("anger_sum").ok(),
                fear_sum: row.try_get("fear_sum").ok(),
                surprise_sum: row.try_get("surprise_sum").ok(),
                disgust_sum: row.try_get("disgust_sum").ok(),
                calm_sum: row.try_get("calm_sum").ok(),
                focus_sum: row.try_get("focus_sum").ok(),
                excitement_sum: row.try_get("excitement_sum").ok(),
                confusion_sum: row.try_get("confusion_sum").ok(),
                emotion_entry_count: row.try_get("emotion_entry_count").ok()?,
                emotion_by_modality: row.try_get::<Option<serde_json::Value>, _>("emotion_by_modality").ok()
                    .flatten()
                    .map(|v| JsonValue {
                        value: serde_json::to_string(&v).unwrap_or_default(),
                    }),
            })
        }).collect();

        Ok(Response::new(GetEmotionVectorsResponse { vectors }))
    }

    async fn get_word_statistics(
        &self,
        request: Request<GetWordStatisticsRequest>,
    ) -> Result<Response<GetWordStatisticsResponse>, Status> {
        let req = request.get_ref();
        let participant_uuid = Uuid::parse_str(&req.participant_id)
            .map_err(from_uuid_parse_error)?;
        
        let mut query = sqlx::QueryBuilder::new(
            "SELECT * FROM timeline_word_statistics_by_session WHERE participant_id = "
        );
        query.push_bind(participant_uuid);
        
        if let Some(session_id) = &req.session_id {
            let session_uuid = Uuid::parse_str(session_id)
                .map_err(from_uuid_parse_error)?;
            query.push(" AND session_id = ");
            query.push_bind(session_uuid);
        }
        
        let rows = query.build()
            .fetch_all(&self.pool)
            .await
            .map_err(from_sqlx_error)?;

        let statistics: Vec<WordStatistics> = rows.into_iter().filter_map(|row| {
            Some(WordStatistics {
                participant_id: row.try_get::<Uuid, _>("participant_id").ok()?.to_string(),
                session_id: row.try_get::<Uuid, _>("session_id").ok()?.to_string(),
                word: row.try_get("word").ok()?,
                count: row.try_get("count").ok()?,
                avg_reaction_time: row.try_get("avg_reaction_time").ok(),
                std_reaction_time: row.try_get("std_reaction_time").ok(),
                var_reaction_time: row.try_get("var_reaction_time").ok(),
                avg_reaction_value: row.try_get("avg_reaction_value").ok(),
                std_reaction_value: row.try_get("std_reaction_value").ok(),
                var_reaction_value: row.try_get("var_reaction_value").ok(),
                avg_physiological: row.try_get("avg_physiological").ok(),
                std_physiological: row.try_get("std_physiological").ok(),
                var_physiological: row.try_get("var_physiological").ok(),
                speed_index: row.try_get("speed_index").ok(),
                phys_series: row.try_get::<Option<Vec<Option<f64>>>, _>("phys_series").ok()?
                    .unwrap_or_default()
                    .into_iter()
                    .flatten()
                    .collect(),
                rt_series: row.try_get::<Option<Vec<Option<f64>>>, _>("rt_series").ok()?
                    .unwrap_or_default()
                    .into_iter()
                    .flatten()
                    .collect(),
            })
        }).collect();

        Ok(Response::new(GetWordStatisticsResponse { statistics }))
    }
}

