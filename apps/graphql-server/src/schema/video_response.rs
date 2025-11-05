//! Video Response GraphQL types
//! 
//! Merkle DAG: graphql.schema.video_response
//! OWL: spirit:VideoResponse

use async_graphql::*;

#[derive(SimpleObject, Clone, Debug)]
pub struct SaveVideoResponse {
    pub success: bool,
    #[graphql(name = "fileUrl")]
    pub file_url: String,
    #[graphql(name = "fileName")]
    pub file_name: String,
    pub message: String,
}

#[derive(InputObject)]
pub struct SaveVideoInput {
    #[graphql(name = "participantId")]
    pub participant_id: String,
    #[graphql(name = "sessionId")]
    pub session_id: String,
    #[graphql(name = "fileName")]
    pub file_name: String,
    #[graphql(name = "fileData")]
    pub file_data: String, // base64 encoded
}

#[derive(InputObject)]
pub struct AnalyzeVideoInput {
    #[graphql(name = "participantId")]
    pub participant_id: String,
    #[graphql(name = "videoFile")]
    pub video_file: String,
    #[graphql(name = "sessionType")]
    pub session_type: String,
}

