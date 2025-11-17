'use client';

/**
 * Merkle DAG: app.providers
 * Client-side providers wrapper
 */

import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  );
}




