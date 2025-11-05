//! GraphQL Query: Sessions
//! 
//! Merkle DAG: graphql.queries.sessions
//! OWL: spirit:Session query

import { gql } from '@apollo/client';

export const GET_SESSIONS = gql`
  query GetSessions($participantId: ID) {
    sessions(participantId: $participantId) {
      id
      participantId
      sessionId
      sessionType
      startTime
      endTime
      createdAt
      updatedAt
    }
  }
`;

