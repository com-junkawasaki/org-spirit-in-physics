//! GraphQL Query: Emotions
//! 
//! Merkle DAG: graphql.queries.emotions.participant
//! OWL: spirit:Emotion query

import { gql } from '@apollo/client';

export const GET_EMOTION_RESULTS = gql`
  query GetEmotionResults($participantId: String!) {
    emotionResults(participantId: $participantId)
  }
`;

export const GET_EMOTION_STATISTICS = gql`
  query GetEmotionStatistics {
    emotionStatistics
  }
`;

