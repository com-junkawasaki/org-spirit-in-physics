//! Apollo Client Configuration
//! 
//! Merkle DAG: graphql.client
//! OWL: spirit:GraphQL Service Port client

import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Use Rust GraphQL server by default
// Can be overridden with NEXT_PUBLIC_RUST_GRAPHQL_URL environment variable
// In Docker, use service name; on client side, use localhost with port; on server side, use service name
const graphqlUrl = process.env.NEXT_PUBLIC_RUST_GRAPHQL_URL || 
  (typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.hostname}:25263/graphql` 
    : process.env.RUST_GRAPHQL_URL || 'http://graphql:3003/graphql');

const httpLink = createHttpLink({
  uri: graphqlUrl,
});

const authLink = setContext((_, { headers }) => {
  // Add any auth headers here if needed
  return {
    headers: {
      ...headers,
    },
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});

