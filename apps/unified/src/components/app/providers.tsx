'use client'

import type { ReactNode } from 'react'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  // Add any global providers here (e.g., theme, query client, etc.)
  return <>{children}</>
}

