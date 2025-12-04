// Merkle DAG: graphql.client
// GraphQL client for connecting to GraphQL service
// 
// @deprecated This file is deprecated. Use gRPC client instead.
// See: apps/unified/src/lib/researcher/grpc/client.ts

import { GraphQLClient } from 'graphql-request';

// Note: Generated GraphQL types have been removed. Use gRPC types instead.

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
      // In production: use production GraphQL URL
      return serverUrl;
    }
    // Fallback: use production URL in production, localhost in development
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      return 'https://graphql.sip.junkawasaki.com/graphql';
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

// Note: GraphQL query documents and types have been removed.
// Use gRPC client functions instead:
// - getParticipants() from '@spirit-in-physics/grpc-client'
// - getSessions() from '@spirit-in-physics/grpc-client'
// - getTimeline() from '@spirit-in-physics/grpc-client'
// etc.
