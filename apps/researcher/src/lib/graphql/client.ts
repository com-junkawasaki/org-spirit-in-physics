//! Apollo Client Configuration
//! 
//! Merkle DAG: graphql.client
//! OWL: spirit:GraphQL Service Port client

import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: typeof window !== 'undefined' ? '/graphql' : 'http://localhost:3000/graphql',
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

