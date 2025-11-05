//! GraphQL Query: Analysis Results
//! 
//! Merkle DAG: graphql.queries.analysis
//! OWL: spirit:AnalysisResult query

import { gql } from '@apollo/client';

export const GET_ANALYSIS_RESULTS = gql`
  query GetAnalysisResults($participantId: ID, $experimentId: ID) {
    analysisResults(participantId: $participantId, experimentId: $experimentId) {
      id
      participantId
      experimentId
      wordStimulusId
      stimulusWord
      responseWord
      reactionTimeMs
      spiritProbability
      word2vecComponent
      reactionTimeComponent
      skinPotentialComponent
      emotionComponent
      emotionData
      physiologicalData
      createdAt
      updatedAt
    }
  }
`;

