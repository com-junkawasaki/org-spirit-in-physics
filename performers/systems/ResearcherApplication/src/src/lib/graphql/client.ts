//! Apollo Client Configuration
//! 
//! Merkle DAG: graphql.client
//! OWL: spirit:GraphQL Service Port client

import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Use Rust GraphQL server by default
// Can be overridden with NEXT_PUBLIC_RUST_GRAPHQL_URL environment variable
// In Docker, use service name; on client side, use relative path or absolute URL; on server side, use service name
function getGraphQLUrl(): string {
  // Environment variable takes precedence
  if (process.env.NEXT_PUBLIC_RUST_GRAPHQL_URL) {
    return process.env.NEXT_PUBLIC_RUST_GRAPHQL_URL;
  }
  
  // Client-side (browser)
  if (typeof window !== 'undefined') {
    // For orb.local domains, always use localhost
    if (window.location.hostname.includes('orb.local')) {
      return 'http://localhost:25263/graphql';
    }
    // For localhost, use localhost with port
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:25263/graphql';
    }
    // For other domains, use same protocol and hostname with port
    return `${window.location.protocol}//${window.location.hostname}:25263/graphql`;
  }
  
  // Server-side: use Docker service name
  return process.env.RUST_GRAPHQL_URL || 'http://graphql:3003/graphql';
}

const graphqlUrl = getGraphQLUrl();

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

