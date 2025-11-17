// Merkle DAG: graphql.client
// GraphQL client for connecting to GraphQL service
// Uses generated types from GraphQL Code Generator

import { GraphQLClient } from 'graphql-request';
import {
  GetParticipantsDocument,
  GetParticipantDocument,
  GetSessionsDocument,
  GetTimelineDocument,
  GetWordAggregatesDocument,
  GetEmotionVectorsDocument,
  GetWordStatisticsDocument,
  type GetParticipantsQueryResult,
  type GetParticipantQueryResult,
  type GetSessionsQueryResult,
  type GetTimelineQueryResult,
  type GetWordAggregatesQueryResult,
  type GetEmotionVectorsQueryResult,
  type GetWordStatisticsQueryResult,
  type GetParticipantsQueryVariables,
  type GetParticipantQueryVariables,
  type GetSessionsQueryVariables,
  type GetTimelineQueryVariables,
  type GetWordAggregatesQueryVariables,
  type GetEmotionVectorsQueryVariables,
  type GetWordStatisticsQueryVariables,
} from '@/generated/graphql';

// Determine GraphQL API URL based on execution context
// Server-side: Use GRAPHQL_API_URL (for Docker internal communication)
// Client-side: Use NEXT_PUBLIC_GRAPHQL_API_URL (for browser access)
// Fallback: localhost for local development
function getGraphQLApiUrl(): string {
  // Server-side (Node.js environment)
  if (typeof window === 'undefined') {
    const serverUrl = process.env.GRAPHQL_API_URL;
    if (serverUrl) {
      // If GRAPHQL_API_URL is explicitly set (e.g., in Docker), use it as-is
      // Docker Compose sets this to http://graphql-service:19910/graphql
      // which works within the Docker network
      return serverUrl;
    }
    // Fallback for server-side local development
    return 'http://localhost:19910/graphql';
  }
  
  // Client-side (browser environment)
  const clientUrl = process.env.NEXT_PUBLIC_GRAPHQL_API_URL;
  if (clientUrl) {
    // Client-side should always use localhost or public URL (never Docker service names)
    // Replace Docker service names with localhost for browser access
    return clientUrl.replace('graphql-service', 'localhost');
  }
  
  // Fallback for client-side local development
  return 'http://localhost:19910/graphql';
}

const GRAPHQL_API_URL = getGraphQLApiUrl();

// Log the GraphQL API URL for debugging (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('[GraphQL Client] Using API URL:', GRAPHQL_API_URL);
  console.log('[GraphQL Client] Environment:', typeof window === 'undefined' ? 'server-side' : 'client-side');
  console.log('[GraphQL Client] GRAPHQL_API_URL:', process.env.GRAPHQL_API_URL);
  console.log('[GraphQL Client] NEXT_PUBLIC_GRAPHQL_API_URL:', process.env.NEXT_PUBLIC_GRAPHQL_API_URL);
}

export const graphqlClient = new GraphQLClient(GRAPHQL_API_URL, {
  headers: {
    'Content-Type': 'application/json',
  },
});

// Re-export generated queries and types for convenience
export {
  GetParticipantsDocument,
  GetParticipantDocument,
  GetSessionsDocument,
  GetTimelineDocument,
  GetWordAggregatesDocument,
  GetEmotionVectorsDocument,
  GetWordStatisticsDocument,
  type GetParticipantsQueryResult,
  type GetParticipantQueryResult,
  type GetSessionsQueryResult,
  type GetTimelineQueryResult,
  type GetWordAggregatesQueryResult,
  type GetEmotionVectorsQueryResult,
  type GetWordStatisticsQueryResult,
  type GetParticipantsQueryVariables,
  type GetParticipantQueryVariables,
  type GetSessionsQueryVariables,
  type GetTimelineQueryVariables,
  type GetWordAggregatesQueryVariables,
  type GetEmotionVectorsQueryVariables,
  type GetWordStatisticsQueryVariables,
};

// Legacy exports for backward compatibility (deprecated - use generated types)
export const GET_PARTICIPANTS = GetParticipantsDocument;
export const GET_PARTICIPANT = GetParticipantDocument;
export const GET_SESSIONS = GetSessionsDocument;
export const GET_TIMELINE = GetTimelineDocument;
export const GET_WORD_AGGREGATES = GetWordAggregatesDocument;
export const GET_EMOTION_VECTORS = GetEmotionVectorsDocument;
export const GET_WORD_STATISTICS = GetWordStatisticsDocument;

