'use client';

/**
 * Merkle DAG: app.providers
 * Client-side providers wrapper
 */

import type { ReactNode } from 'react';
import { ApolloProvider } from '@/components/providers/ApolloProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ApolloProvider>
      {children}
    </ApolloProvider>
  );
}

