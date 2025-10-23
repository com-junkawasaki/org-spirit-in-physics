import type { ReactNode } from 'react';
import HeaderUser from '../components/HeaderUser';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full border-b bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-semibold">Admin</div>
          <HeaderUser />
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}


