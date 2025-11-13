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
      created_at
      updated_at
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
      created_at
      updated_at
    }
  }
`;

// Get sessions for a participant
export const GET_SESSIONS = gql`
  query GetSessions($participantId: ID!) {
    sessions(participant_id: $participantId) {
      id
      participant_id
      session_index
      start_ts
      end_ts
      events
      created_at
      updated_at
    }
  }
`;

