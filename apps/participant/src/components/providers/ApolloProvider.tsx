'use client';

/**
 * Merkle DAG: providers.apollo
 * Apollo Client Provider for GraphQL
 */

import { ApolloProvider as BaseApolloProvider } from '@apollo/client';
import { apolloClient } from '../../lib/graphql';

export function ApolloProvider({ children }: { children: React.ReactNode }) {
  return <BaseApolloProvider client={apolloClient}>{children}</BaseApolloProvider>;
}

