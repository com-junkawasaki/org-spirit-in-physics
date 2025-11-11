// Merkle DAG: graphql.client
// GraphQL client for connecting to GraphQL service

import { GraphQLClient } from 'graphql-request';

const GRAPHQL_API_URL = process.env.GRAPHQL_API_URL || process.env.NEXT_PUBLIC_GRAPHQL_API_URL || 'http://localhost:8081/graphql';

export const graphqlClient = new GraphQLClient(GRAPHQL_API_URL, {
  headers: {
    'Content-Type': 'application/json',
  },
});

// GraphQL queries
export const GET_PARTICIPANTS = `
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

export const GET_PARTICIPANT = `
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

export const GET_SESSIONS = `
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

export const GET_TIMELINE = `
  query GetTimeline(
    $participantId: ID!
    $sessionId: ID
    $startTime: String
    $endTime: String
    $interval: String
  ) {
    timeline(
      participant_id: $participantId
      session_id: $sessionId
      start_time: $startTime
      end_time: $endTime
      interval: $interval
    ) {
      time
      participant_id
      session_id
      word
      event_type
      reaction_value
      reaction_time
      has_response
      emotions {
        name
        score
        file_type
      }
      physiological
      metadata
    }
  }
`;

