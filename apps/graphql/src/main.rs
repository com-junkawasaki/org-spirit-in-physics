use async_graphql::{
    Context, EmptyMutation, EmptySubscription, Object, Schema, SimpleObject,
    http::{GraphQLPlaygroundConfig, playground_source},
};
use async_graphql_warp::graphql;
use dotenvy::dotenv;
use std::sync::Arc;
use std::convert::Infallible;
use warp::{Filter, Reply};

use async_graphql::{Context, EmptySubscription, Object, Query, Result as GQLResult, SchemaBuilder};
use diesel::prelude::*;
use std::sync::Arc;
use tokio_postgres::NoTls;
use diesel_async::pooled_connection::deadpool::Pool;
use diesel_async::RunQueryDsl;

use crate::models::{Participant, NewParticipant, Experiment, NewExperiment, Window, NewWindow, EmotionAggregation, NewEmotionAggregation, PhysiologicalAggregation, NewPhysiologicalAggregation, KernelFusionRun, NewKernelFusionRun, EmbeddingResult, NewEmbeddingResult};

mod db;

use db::{DbPool, establish_connection};

#[derive(SimpleObject)]
struct Participant {
    id: String,
    age: Option<i32>,
    gender: Option<String>,
    handedness: Option<String>,
    created_at: String,
    updated_at: String,
}

pub struct Query;

#[Object]
impl Query {
    async fn participants(&self, ctx: &Context<'_>) -> GQLResult<Vec<Participant>> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let participants = participants::table.load::<Participant>(&mut conn).await?;
        Ok(participants)
    }

    async fn experiments(&self, ctx: &Context<'_>) -> GQLResult<Vec<Experiment>> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let experiments = experiments::table.load::<Experiment>(&mut conn).await?;
        Ok(experiments)
    }

    async fn windows(&self, ctx: &Context<'_>) -> GQLResult<Vec<Window>> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let windows = windows::table.load::<Window>(&mut conn).await?;
        Ok(windows)
    }

    async fn emotion_aggregations(&self, ctx: &Context<'_>) -> GQLResult<Vec<EmotionAggregation>> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let emotion_aggregations = emotion_aggregations::table.load::<EmotionAggregation>(&mut conn).await?;
        Ok(emotion_aggregations)
    }

    async fn physiological_aggregations(&self, ctx: &Context<'_>) -> GQLResult<Vec<PhysiologicalAggregation>> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let physiological_aggregations = physiological_aggregations::table.load::<PhysiologicalAggregation>(&mut conn).await?;
        Ok(physiological_aggregations)
    }

    async fn kernel_fusion_runs(&self, ctx: &Context<'_>) -> GQLResult<Vec<KernelFusionRun>> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let kernel_fusion_runs = kernel_fusion_runs::table.load::<KernelFusionRun>(&mut conn).await?;
        Ok(kernel_fusion_runs)
    }

    async fn embedding_results(&self, ctx: &Context<'_>) -> GQLResult<Vec<EmbeddingResult>> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let embedding_results = embedding_results::table.load::<EmbeddingResult>(&mut conn).await?;
        Ok(embedding_results)
    }
}

pub struct Mutation;

#[Object]
impl Mutation {
    async fn create_participant(&self, ctx: &Context<'_>, input: NewParticipant) -> GQLResult<Participant> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let new_participant = conn.build_transaction().run(|mut conn| {
            Box::pin(async move {
                let participant = diesel::insert_into(participants::table)
                    .values(&input)
                    .returning(Participant::as_returning())
                    .get_result(&mut conn)
                    .await?;
                Ok(participant)
            })
        }).await?;
        Ok(new_participant)
    }

    async fn create_experiment(&self, ctx: &Context<'_>, input: NewExperiment) -> GQLResult<Experiment> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let new_experiment = conn.build_transaction().run(|mut conn| {
            Box::pin(async move {
                let experiment = diesel::insert_into(experiments::table)
                    .values(&input)
                    .returning(Experiment::as_returning())
                    .get_result(&mut conn)
                    .await?;
                Ok(experiment)
            })
        }).await?;
        Ok(new_experiment)
    }

    async fn create_window(&self, ctx: &Context<'_>, input: NewWindow) -> GQLResult<Window> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let new_window = conn.build_transaction().run(|mut conn| {
            Box::pin(async move {
                let window = diesel::insert_into(windows::table)
                    .values(&input)
                    .returning(Window::as_returning())
                    .get_result(&mut conn)
                    .await?;
                Ok(window)
            })
        }).await?;
        Ok(new_window)
    }

    async fn create_emotion_aggregation(&self, ctx: &Context<'_>, input: NewEmotionAggregation) -> GQLResult<EmotionAggregation> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let new_emotion_aggregation = conn.build_transaction().run(|mut conn| {
            Box::pin(async move {
                let emotion_aggregation = diesel::insert_into(emotion_aggregations::table)
                    .values(&input)
                    .returning(EmotionAggregation::as_returning())
                    .get_result(&mut conn)
                    .await?;
                Ok(emotion_aggregation)
            })
        }).await?;
        Ok(new_emotion_aggregation)
    }

    async fn create_physiological_aggregation(&self, ctx: &Context<'_>, input: NewPhysiologicalAggregation) -> GQLResult<PhysiologicalAggregation> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let new_physiological_aggregation = conn.build_transaction().run(|mut conn| {
            Box::pin(async move {
                let physiological_aggregation = diesel::insert_into(physiological_aggregations::table)
                    .values(&input)
                    .returning(PhysiologicalAggregation::as_returning())
                    .get_result(&mut conn)
                    .await?;
                Ok(physiological_aggregation)
            })
        }).await?;
        Ok(new_physiological_aggregation)
    }

    async fn create_kernel_fusion_run(&self, ctx: &Context<'_>, input: NewKernelFusionRun) -> GQLResult<KernelFusionRun> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let new_kernel_fusion_run = conn.build_transaction().run(|mut conn| {
            Box::pin(async move {
                let kernel_fusion_run = diesel::insert_into(kernel_fusion_runs::table)
                    .values(&input)
                    .returning(KernelFusionRun::as_returning())
                    .get_result(&mut conn)
                    .await?;
                Ok(kernel_fusion_run)
            })
        }).await?;
        Ok(new_kernel_fusion_run)
    }

    async fn create_embedding_result(&self, ctx: &Context<'_>, input: NewEmbeddingResult) -> GQLResult<EmbeddingResult> {
        let pool = ctx.data::<Arc<Pool<NoTls>>>()?;
        let mut conn = pool.get().await?;
        let new_embedding_result = conn.build_transaction().run(|mut conn| {
            Box::pin(async move {
                let embedding_result = diesel::insert_into(embedding_results::table)
                    .values(&input)
                    .returning(EmbeddingResult::as_returning())
                    .get_result(&mut conn)
                    .await?;
                Ok(embedding_result)
            })
        }).await?;
        Ok(new_embedding_result)
    }
}

pub type Schema = async_graphql::Schema<Query, Mutation, EmptySubscription>;

pub async fn create_schema(pool: Arc<Pool<NoTls>>) -> Schema {
    Schema::build(Query, Mutation, EmptySubscription)
        .data(pool)
        .finish()
}

type GraphQLSchema = Schema<Query, EmptyMutation, EmptySubscription>;

#[tokio::main]
async fn main() {
    dotenv().ok();

    let pool = Arc::new(establish_connection());
    let schema = Schema::build(Query, EmptyMutation, EmptySubscription)
        .data(pool.clone())
        .finish();

    let graphql_post = graphql(schema)
        .and_then(|(schema, request): (GraphQLSchema, async_graphql::Request)| async move {
            Ok::<_, Infallible>(warp::reply::json(&schema.execute(request).await))
        });

    let graphql_playground = warp::path::end().map(|| {
        warp::reply::html(playground_source(GraphQLPlaygroundConfig::new("/graphql")))
    });

    let routes = graphql_playground
        .or(warp::path("graphql").and(graphql_post));

    println!("GraphQL server running on http://localhost:8080");
    println!("GraphiQL playground available at http://localhost:8080");

    warp::serve(routes).run(([0, 0, 0, 0], 8080)).await;
}
