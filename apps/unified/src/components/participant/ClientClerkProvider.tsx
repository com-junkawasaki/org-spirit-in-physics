'use client';

// TODO: Fix ClerkProvider import - @clerk/astro/react doesn't export ClerkProvider
// For Astro, Clerk might be configured differently. Check @clerk/astro documentation.
import type { ReactNode } from 'react';

interface ClientClerkProviderProps {
  children: ReactNode;
}

export default function ClientClerkProvider({ children }: ClientClerkProviderProps) {
  // Temporarily return children directly until ClerkProvider is properly configured
  return <>{children}</>;
}

