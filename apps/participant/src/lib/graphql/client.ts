/**
 * Merkle DAG: graphql.client
 * Apollo Client configuration for GraphQL API
 */

import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

// GraphQL API URL
const GRAPHQL_API_URL = 
  typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_GRAPHQL_API_URL || 'http://localhost:8081/graphql')
    : (process.env.GRAPHQL_API_URL || 'http://localhost:8081/graphql');

// HTTP Link
const httpLink = createHttpLink({
  uri: GRAPHQL_API_URL,
  credentials: 'include',
});

// Error Link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// Auth Link with Clerk token
const authLink = setContext(async (_, { headers }) => {
  // Get Clerk token (works on both client and server)
  // On client side, this will use cookies; on server side, it will use the request context
  let token: string | null = null;
  
  if (typeof window !== 'undefined') {
    // Client-side: use Clerk's client-side token retrieval
    // Note: In a real implementation, you might want to use useAuth hook in a component
    // and pass the token through context, or use Clerk's getToken() from @clerk/nextjs
    // For now, we'll rely on cookies being sent automatically
    // Clerk automatically includes the token in cookies for same-origin requests
  } else {
    // Server-side: get token from request
    // This will be handled by Clerk middleware automatically via cookies
    // For server-side requests, we can get the token if needed
    try {
      // In server-side context, Clerk middleware handles authentication
      // The token is available via cookies automatically
    } catch (error) {
      console.warn('Failed to get Clerk token:', error);
    }
  }
  
  return {
    headers: {
      ...headers,
      // Clerk token is automatically included in cookies for same-origin requests
      // If you need to send it as Authorization header, uncomment below:
      // ...(token && { authorization: `Bearer ${token}` }),
    },
  };
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Participant: {
        keyFields: ['id'],
      },
      Session: {
        keyFields: ['id'],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

