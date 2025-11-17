'use client';

/**
 * Merkle DAG: app.providers
 * Client-side providers wrapper
 */

import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '@/lib/graphql/apollo-client';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ApolloProvider client={apolloClient}>
        {children}
      </ApolloProvider>
    </ClerkProvider>
  );
}




