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
export function getGraphQLApiUrl(): string {
  // Server-side (Node.js environment)
  if (typeof window === 'undefined') {
    const serverUrl = process.env.GRAPHQL_API_URL;
    if (serverUrl) {
      // In Docker: graphql-service resolves within the Docker network
      // Outside Docker: use localhost (fallback)
      return serverUrl;
    }
    // Fallback for server-side local development
    return 'http://localhost:8081/graphql';
  }
  
  // Client-side (browser environment)
  // Use Next.js API route as proxy to avoid CORS and mixed content issues
  return '/api/graphql';
}

// Create a function that returns a GraphQL client with the correct URL
// This ensures the URL is determined at runtime, not at module load time
export function createGraphQLClient(): GraphQLClient {
  const url = getGraphQLApiUrl();
  
  // Log the GraphQL API URL for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[GraphQL Client] Using API URL:', url);
    console.log('[GraphQL Client] Environment:', typeof window === 'undefined' ? 'server-side' : 'client-side');
    console.log('[GraphQL Client] GRAPHQL_API_URL:', process.env.GRAPHQL_API_URL);
    console.log('[GraphQL Client] NEXT_PUBLIC_GRAPHQL_API_URL:', process.env.NEXT_PUBLIC_GRAPHQL_API_URL);
  }
  
  // Note: For client-side requests, authentication is handled via the API proxy route
  // The proxy route (/api/graphql) will add the Supabase token from cookies
  // For server-side requests, we can add the token here if needed
  const client = new GraphQLClient(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  // Wrap request method to add better error handling
  const originalRequest = client.request.bind(client);
  (client as any).request = async function<T = any, V extends Record<string, any> = Record<string, any>>(
    document: any,
    variables?: V
  ): Promise<T> {
    try {
      return await (originalRequest as any)(document, variables || ({} as V)) as T;
    } catch (error: any) {
      // Enhance error messages with more context
      if (error?.response) {
        const errorMessage = error.response.errors?.[0]?.message || error.message;
        const errorCode = error.response.errors?.[0]?.extensions?.code;
        console.error('[GraphQL Client] GraphQL error:', {
          message: errorMessage,
          code: errorCode,
          url,
          variables,
        });
        throw new Error(`GraphQL query failed: ${errorMessage}${errorCode ? ` (code: ${errorCode})` : ''}`);
      } else if (error?.request) {
        // Network error
        console.error('[GraphQL Client] Network error:', {
          message: error.message,
          url,
          variables,
        });
        throw new Error(`GraphQL connection failed: ${error.message}. URL: ${url}`);
      } else {
        // Unknown error
        console.error('[GraphQL Client] Unknown error:', error);
        throw error;
      }
    }
  };
  
  return client;
}

// Export a default client for backward compatibility
// Note: This uses a fallback URL and may not work correctly in all contexts
// Prefer using createGraphQLClient() in API routes
export const graphqlClient = createGraphQLClient();

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

