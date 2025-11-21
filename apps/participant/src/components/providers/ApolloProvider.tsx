'use client';

/**
 * Merkle DAG: providers.apollo
 * Apollo Client Provider for GraphQL
 */

import type { ReactNode } from 'react';
import { ApolloProvider as BaseApolloProvider } from '@apollo/client/react';
import { apolloClient } from '@/lib/graphql';

export function ApolloProvider({ children }: { children: ReactNode }) {
  return <BaseApolloProvider client={apolloClient}>{children}</BaseApolloProvider>;
}

