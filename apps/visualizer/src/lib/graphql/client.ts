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

export const GET_TIMELINE = `
  query GetTimeline(
    $participantId: ID!
    $sessionId: ID
    $startTime: String
    $endTime: String
    $interval: String
  ) {
    timeline(
      participantId: $participantId
      sessionId: $sessionId
      startTime: $startTime
      endTime: $endTime
      interval: $interval
    ) {
      time
      participantId
      sessionId
      word
      eventType
      reactionValue
      reactionTime
      hasResponse
      emotions {
        name
        score
        fileType
      }
      physiological
      metadata
    }
  }
`;

