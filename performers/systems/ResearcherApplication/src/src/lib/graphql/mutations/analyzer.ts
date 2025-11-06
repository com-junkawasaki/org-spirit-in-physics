//! GraphQL Mutation: Analyze Participant
//! 
//! Merkle DAG: graphql.mutations.analyzer
//! OWL: spirit:AnalysisPipeline mutation

import { gql } from '@apollo/client';

export const ANALYZE_PARTICIPANT = gql`
  mutation AnalyzeParticipant($participantId: String!, $experimentId: String) {
    analyzeParticipant(participantId: $participantId, experimentId: $experimentId) {
      success
      result
      error
    }
  }
`;

