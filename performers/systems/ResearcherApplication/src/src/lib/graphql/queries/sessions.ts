//! GraphQL Query: Sessions
//! 
//! Merkle DAG: graphql.queries.sessions
//! OWL: spirit:Session query

import { gql } from '@apollo/client';

export const GET_SESSIONS = gql`
  query GetSessions($participantId: String) {
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

export const GET_SESSIONS_BY_PARTICIPANT = gql`
  query GetSessionsByParticipant($participantId: String!) {
    sessionsByParticipant(participantId: $participantId) {
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

