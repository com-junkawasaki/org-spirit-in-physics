'use client';

import { ApolloProvider } from '@apollo/client/react';
import { apolloClient } from '@/lib/graphql/client';

/**
 * GraphQL プロバイダー
 * 
 * Merkle DAG: participant.providers
 * OWL: spirit:ParticipantApplication.initializes GraphQL client
 * 
 * tRPC and React Query have been removed. Only GraphQL (Apollo Client) is used now.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={apolloClient}>
      {children}
    </ApolloProvider>
  );
}

