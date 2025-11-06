//! GraphQL Mutation: Emotions
//! 
//! Merkle DAG: graphql.mutations.emotions.participant
//! OWL: spirit:Emotion mutation

import { gql } from '@apollo/client';

export const ANALYZE_VIDEO_EMOTIONS = gql`
  mutation AnalyzeVideoEmotions($input: AnalyzeVideoInput!) {
    analyzeVideoEmotions(input: $input) {
      success
      result
      error
    }
  }
`;

