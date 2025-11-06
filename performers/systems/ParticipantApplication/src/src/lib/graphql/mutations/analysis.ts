//! GraphQL Mutation: Analysis
//! 
//! Merkle DAG: graphql.mutations.analysis.participant
//! OWL: spirit:Analysis mutation

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

export const ANALYZE_ALL_PARTICIPANTS = gql`
  mutation AnalyzeAllParticipants {
    analyzeAllParticipants {
      success
      result
      error
    }
  }
`;

