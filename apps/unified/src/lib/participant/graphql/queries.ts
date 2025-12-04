/**
 * Merkle DAG: graphql.queries
 * GraphQL queries for participant and session data
 */

import { gql } from '@apollo/client';

// Get all participants
export const GET_PARTICIPANTS = gql`
  query GetParticipants {
    participants {
      id
      age
      gender
      handedness
      createdAt
      updatedAt
    }
  }
`;

// Get participant by ID
export const GET_PARTICIPANT = gql`
  query GetParticipant($id: ID!) {
    participant(id: $id) {
      id
      age
      gender
      handedness
      createdAt
      updatedAt
    }
  }
`;

// Get sessions for a participant
export const GET_SESSIONS = gql`
  query GetSessions($participantId: ID!) {
    sessions(participantId: $participantId) {
      id
      participantId
      sessionIndex
      startTs
      endTs
      events
      createdAt
      updatedAt
    }
  }
`;

