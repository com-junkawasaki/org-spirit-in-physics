'use client';

import { ClerkProvider } from '@clerk/astro/react';
import type { ReactNode } from 'react';

interface ClientClerkProviderProps {
  children: ReactNode;
}

export default function ClientClerkProvider({ children }: ClientClerkProviderProps) {
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  );
}

