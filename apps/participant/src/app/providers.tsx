'use client';

import { ApolloProvider } from '@apollo/client/react';
import { apolloClient } from '@/lib/graphql/client';

/**
 * GraphQL プロバイダー
 * 
 * Merkle DAG: participant.providers
 * OWL: spirit:ParticipantApplication.initializes GraphQL client
 * 
 * GraphQL (Apollo Client) を使用しています。
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={apolloClient}>
      {children}
    </ApolloProvider>
  );
}

