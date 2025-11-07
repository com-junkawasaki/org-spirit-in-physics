//! GraphQL subscription resolvers
//!
//! リアルタイム感情ストリームのサブスクリプション。

use async_graphql::*;
use futures::Stream;
use crate::graphql::mutation::EmotionDimensionsOutput;

/// Subscription root
#[derive(Default)]
pub struct Subscription;

#[Subscription]
impl Subscription {
    /// Subscribe to real-time emotion stream for a person
    async fn emotion_stream(
        &self,
        _ctx: &Context<'_>,
        person_uri: String,
    ) -> impl Stream<Item = EmotionStreamEvent> {
        // TODO: Implement real-time stream
        // For now, return empty stream
        futures::stream::empty()
    }
}

/// Emotion stream event
#[derive(SimpleObject)]
pub struct EmotionStreamEvent {
    pub person_uri: String,
    pub emotion_dimensions: EmotionDimensionsOutput,
    pub timestamp: String,
}

