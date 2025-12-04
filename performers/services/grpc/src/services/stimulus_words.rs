// Merkle DAG: grpc.service.services.stimulus_words
// StimulusWord gRPC service implementation

use tonic::{Request, Response, Status};
use sqlx::{Pool, Postgres};
use crate::error::from_sqlx_error;

// Generated proto types
use crate::generated::stimulus_words::v1::{
    stimulus_word_service_server::StimulusWordService,
    GetStimulusWordsRequest, GetStimulusWordsResponse,
    GetStimulusWordRequest, GetStimulusWordResponse,
    StimulusWord,
};

pub struct StimulusWordServiceImpl {
    pool: Pool<Postgres>,
}

impl StimulusWordServiceImpl {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }
}

#[tonic::async_trait]
impl StimulusWordService for StimulusWordServiceImpl {
    async fn get_stimulus_words(
        &self,
        _request: Request<GetStimulusWordsRequest>,
    ) -> Result<Response<GetStimulusWordsResponse>, Status> {
        let rows = sqlx::query_as::<_, (i32, String, String, String)>(
            "SELECT id, japanese, english, pronunciation FROM stimulus_words ORDER BY id"
        )
        .fetch_all(&self.pool)
        .await
        .map_err(from_sqlx_error)?;

        let words = rows.into_iter().map(|(id, japanese, english, pronunciation)| {
            StimulusWord {
                id,
                japanese,
                english,
                pronunciation,
            }
        }).collect();

        Ok(Response::new(GetStimulusWordsResponse { words }))
    }

    async fn get_stimulus_word(
        &self,
        request: Request<GetStimulusWordRequest>,
    ) -> Result<Response<GetStimulusWordResponse>, Status> {
        let row = sqlx::query_as::<_, (i32, String, String, String)>(
            "SELECT id, japanese, english, pronunciation FROM stimulus_words WHERE id = $1"
        )
        .bind(request.get_ref().id)
        .fetch_optional(&self.pool)
        .await
        .map_err(from_sqlx_error)?;

        let word = row.map(|(id, japanese, english, pronunciation)| {
            StimulusWord {
                id,
                japanese,
                english,
                pronunciation,
            }
        });

        Ok(Response::new(GetStimulusWordResponse { word }))
    }
}

