// Merkle DAG: graphql.apollo_client
// Apollo Client configuration for GraphQL Subscriptions
// Uses WebSocket for real-time subscriptions

import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

// Determine GraphQL API URL based on execution context
function getGraphQLApiUrl(): string {
  if (typeof window === 'undefined') {
    const serverUrl = process.env.GRAPHQL_API_URL;
    if (serverUrl) {
      return serverUrl;
    }
    return 'http://localhost:8081/graphql';
  }
  
  const clientUrl = process.env.NEXT_PUBLIC_GRAPHQL_API_URL;
  if (clientUrl) {
    return clientUrl.replace('graphql-service', 'localhost');
  }
  
  return 'http://localhost:8081/graphql';
}

// Determine WebSocket URL
function getWebSocketUrl(): string {
  const httpUrl = getGraphQLApiUrl();
  // Convert http://localhost:8081/graphql to ws://localhost:8081/graphql/ws
  // or https://example.com/graphql to wss://example.com/graphql/ws
  return httpUrl.replace(/^http/, 'ws').replace(/\/graphql$/, '/graphql/ws');
}

const httpLink = new HttpLink({
  uri: getGraphQLApiUrl(),
});

// WebSocket link for subscriptions (client-side only)
const wsLink = typeof window !== 'undefined'
  ? new GraphQLWsLink(
      createClient({
        url: getWebSocketUrl(),
      })
    )
  : null;

// Split link: use WebSocket for subscriptions, HTTP for queries and mutations
const splitLink = typeof window !== 'undefined' && wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      httpLink
    )
  : httpLink;

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

