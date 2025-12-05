// Merkle DAG: graphql.service.schema
// GraphQL schema definition using juniper-from-schema

use juniper::{RootNode, EmptySubscription, ScalarValue};
use sqlx::Pool;
use sqlx::Postgres;
use crate::resolvers::{ParticipantQuery, TimelineQuery, ParticipantMutation};
use crate::auth::context::AuthContext;

// Generate schema from GraphQL SDL file
juniper_from_schema::from_schema_file!("schema.graphql");

// Scalar type implementations
#[juniper::graphql_scalar(description = "DateTime")]
type DateTime = String;

#[juniper::graphql_scalar(description = "JSON")]
type JSON = serde_json::Value;

// Context type for Juniper
pub struct Context {
    pub pool: Pool<Postgres>,
    pub auth: Option<AuthContext>,
}

impl juniper::Context for Context {}

pub type Schema = RootNode<'static, Query, Mutation, EmptySubscription<()>>;

pub struct Query;

#[juniper::graphql_object(context = Context)]
impl Query {
    // Delegate to ParticipantQuery
    async fn participants(context: &Context) -> juniper::FieldResult<Vec<Participant>> {
        ParticipantQuery::participants(context).await
    }

    async fn participant(context: &Context, id: juniper::ID) -> juniper::FieldResult<Option<Participant>> {
        ParticipantQuery::participant(context, id).await
    }

    async fn stimulus_words(context: &Context) -> juniper::FieldResult<Vec<StimulusWord>> {
        ParticipantQuery::stimulus_words(context).await
    }

    async fn stimulus_word(context: &Context, id: i32) -> juniper::FieldResult<Option<StimulusWord>> {
        ParticipantQuery::stimulus_word(context, id).await
    }

    async fn sessions(context: &Context, participant_id: juniper::ID) -> juniper::FieldResult<Vec<Session>> {
        TimelineQuery::sessions(context, participant_id).await
    }

    async fn timeline(
        context: &Context,
        participant_id: juniper::ID,
        session_id: Option<juniper::ID>,
        start_time: Option<String>,
        end_time: Option<String>,
        interval: Option<String>,
    ) -> juniper::FieldResult<Vec<TimelinePoint>> {
        TimelineQuery::timeline(context, participant_id, session_id, start_time, end_time, interval).await
    }

    async fn word_aggregates(
        context: &Context,
        participant_id: juniper::ID,
        session_id: Option<juniper::ID>,
    ) -> juniper::FieldResult<Vec<WordAggregate>> {
        TimelineQuery::word_aggregates(context, participant_id, session_id).await
    }

    async fn emotion_vectors(
        context: &Context,
        participant_id: juniper::ID,
        session_id: Option<juniper::ID>,
    ) -> juniper::FieldResult<Vec<EmotionVector>> {
        TimelineQuery::emotion_vectors(context, participant_id, session_id).await
    }

    async fn word_statistics(
        context: &Context,
        participant_id: juniper::ID,
        session_id: Option<juniper::ID>,
    ) -> juniper::FieldResult<Vec<WordStatistics>> {
        TimelineQuery::word_statistics(context, participant_id, session_id).await
    }
}

pub struct Mutation;

#[juniper::graphql_object(context = Context)]
impl Mutation {
    async fn create_participant(
        context: &Context,
        input: CreateParticipantInput,
    ) -> juniper::FieldResult<Participant> {
        ParticipantMutation::create_participant(context, input).await
    }

    async fn create_session(
        context: &Context,
        input: CreateSessionInput,
    ) -> juniper::FieldResult<Session> {
        ParticipantMutation::create_session(context, input).await
    }

    async fn upload_artifact(
        context: &Context,
        input: UploadArtifactInput,
    ) -> juniper::FieldResult<String> {
        ParticipantMutation::upload_artifact(context, input).await
    }
}

pub fn create_schema(pool: Pool<Postgres>) -> Schema {
    Schema::new(Query, Mutation, EmptySubscription::new())
}
