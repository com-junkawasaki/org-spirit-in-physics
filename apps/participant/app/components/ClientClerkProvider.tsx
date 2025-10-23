'use client';

import { ClerkProvider } from '@clerk/nextjs';
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


