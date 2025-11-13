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

// Auth Link (if needed in the future)
const authLink = setContext((_, { headers }) => {
  // Get auth token from localStorage or cookies if needed
  // const token = localStorage.getItem('token');
  
  return {
    headers: {
      ...headers,
      // authorization: token ? `Bearer ${token}` : '',
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

