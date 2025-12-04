'use client';

import { SidebarProvider } from '@/contexts/SidebarContext';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { MobileMenuOverlay } from '@/components/MobileMenuOverlay';
import { Providers } from '../app/providers';
import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <Providers>
      <SidebarProvider>
        <div className="min-h-screen flex">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 overflow-auto">
              <div className="h-full container-ipad mx-auto">{children}</div>
            </main>
          </div>
          <MobileMenuOverlay />
        </div>
      </SidebarProvider>
    </Providers>
  );
}

