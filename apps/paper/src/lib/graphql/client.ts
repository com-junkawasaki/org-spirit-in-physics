// Merkle DAG: graphql.client
// GraphQL client for connecting to GraphQL service

import { GraphQLClient } from 'graphql-request';

// Determine GraphQL API URL based on execution context
// Astro server-side: Use GRAPHQL_API_URL (for Docker internal communication)
// Fallback: localhost for local development
function getGraphQLApiUrl(): string {
  // Astro runs server-side, so we use import.meta.env
  const serverUrl = import.meta.env.GRAPHQL_API_URL;
  if (serverUrl) {
    // If GRAPHQL_API_URL is explicitly set (e.g., in Docker), use it as-is
    // Docker Compose sets this to http://graphql-service:8081/graphql
    // which works within the Docker network
    return serverUrl;
  }
  // Fallback for local development
  return 'http://localhost:8081/graphql';
}

const GRAPHQL_API_URL = getGraphQLApiUrl();

// Log the GraphQL API URL for debugging (only in development)
if (import.meta.env.DEV) {
  console.log('[GraphQL Client] Using API URL:', GRAPHQL_API_URL);
  console.log('[GraphQL Client] GRAPHQL_API_URL:', import.meta.env.GRAPHQL_API_URL);
}

export const graphqlClient = new GraphQLClient(GRAPHQL_API_URL, {
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Execute a GraphQL query with improved error handling
 */
export async function executeQuery<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  try {
    const data = await graphqlClient.request<T>(query, variables);
    return data;
  } catch (error: any) {
    // Handle 404 errors gracefully
    if (error?.response?.status === 404) {
      console.warn('[GraphQL Client] API endpoint not found (404). GraphQL service may not be running.');
      console.warn('[GraphQL Client] Falling back to empty data.');
      // Return empty data structure instead of throwing
      return {} as T;
    }
    // Handle network errors
    if (error?.message?.includes('fetch failed') || error?.message?.includes('ECONNREFUSED')) {
      console.warn('[GraphQL Client] Connection refused. GraphQL service may not be running.');
      console.warn('[GraphQL Client] Falling back to empty data.');
      return {} as T;
    }
    console.error('[GraphQL Client] Query error:', error);
    // For other errors, still return empty data to prevent page crash
    return {} as T;
  }
}

