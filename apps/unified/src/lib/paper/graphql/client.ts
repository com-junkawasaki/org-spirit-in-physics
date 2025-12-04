// Merkle DAG: graphql.client
// GraphQL client for connecting to GraphQL service

import { GraphQLClient } from 'graphql-request';

// Determine GraphQL API URL based on execution context
// Astro server-side: Use GRAPHQL_API_URL (for Docker internal communication)
// Fallback: localhost for local development
function getGraphQLApiUrl(): string {
  // Astro runs server-side, so we use import.meta.env
  // Check both import.meta.env and process.env for compatibility
  const serverUrl = import.meta.env.GRAPHQL_API_URL || 
                    (typeof process !== 'undefined' ? process.env.GRAPHQL_API_URL : undefined);
  
  if (serverUrl) {
    // If GRAPHQL_API_URL is explicitly set (e.g., in Docker), use it as-is
    // Docker Compose sets this to http://graphql-service:8081/graphql
    // which works within the Docker network
    // However, if we're not in Docker network, replace graphql-service with localhost
    if (serverUrl.includes('graphql-service') && typeof process !== 'undefined') {
      // Check if we're running in Docker by checking if we can resolve the hostname
      // If not, fallback to localhost
      const isDockerNetwork = process.env.DOCKER_NETWORK === 'true' || 
                              process.env.NODE_ENV === 'production';
      if (!isDockerNetwork) {
        // Replace Docker service name with localhost for local development
        return serverUrl.replace('graphql-service', 'localhost');
      }
    }
    return serverUrl;
  }
  // Fallback for local development
  return 'http://localhost:8081/graphql';
}

// Create a function that returns a GraphQL client with the correct URL
// This ensures the URL is determined at runtime, not at module load time
function createGraphQLClientInstance(): GraphQLClient {
  const url = getGraphQLApiUrl();
  
  // Log the GraphQL API URL for debugging (only in development)
  if (import.meta.env.DEV) {
    console.log('[GraphQL Client] Using API URL:', url);
    console.log('[GraphQL Client] GRAPHQL_API_URL env:', import.meta.env.GRAPHQL_API_URL);
    if (typeof process !== 'undefined') {
      console.log('[GraphQL Client] process.env.GRAPHQL_API_URL:', process.env.GRAPHQL_API_URL);
    }
  }
  
  return new GraphQLClient(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// Export a function that creates a client instance rather than a singleton
// This allows the URL to be resolved at runtime
export const graphqlClient = createGraphQLClientInstance();

/**
 * Execute a GraphQL query with improved error handling
 */
export async function executeQuery<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  // Create a fresh client instance to ensure URL is resolved at runtime
  const client = createGraphQLClientInstance();
  
  try {
    const data = await client.request<T>(query, variables);
    return data;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code;
    
    // Handle DNS resolution errors (ENOTFOUND)
    if (errorCode === 'ENOTFOUND' || errorMessage.includes('ENOTFOUND') || 
        errorMessage.includes('getaddrinfo')) {
      console.warn('[GraphQL Client] DNS resolution failed. GraphQL service hostname cannot be resolved.');
      console.warn('[GraphQL Client] Error details:', {
        message: errorMessage,
        code: errorCode,
        url: getGraphQLApiUrl(),
      });
      console.warn('[GraphQL Client] Falling back to empty data.');
      return {} as T;
    }
    
    // Handle 404 errors gracefully
    if (error?.response?.status === 404) {
      console.warn('[GraphQL Client] API endpoint not found (404). GraphQL service may not be running.');
      console.warn('[GraphQL Client] Falling back to empty data.');
      return {} as T;
    }
    
    // Handle network errors
    if (errorMessage.includes('fetch failed') || 
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ECONNRESET')) {
      console.warn('[GraphQL Client] Connection refused or reset. GraphQL service may not be running.');
      console.warn('[GraphQL Client] Error details:', {
        message: errorMessage,
        code: errorCode,
        url: getGraphQLApiUrl(),
      });
      console.warn('[GraphQL Client] Falling back to empty data.');
      return {} as T;
    }
    
    console.error('[GraphQL Client] Query error:', {
      message: errorMessage,
      code: errorCode,
      stack: error?.stack,
      url: getGraphQLApiUrl(),
    });
    // For other errors, still return empty data to prevent page crash
    return {} as T;
  }
}

