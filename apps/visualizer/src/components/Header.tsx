'use client'

import { useSidebar } from '@/contexts/SidebarContext'

export function Header() {
  const { setMobileMenuOpen } = useSidebar()

  return (
    <header className="bg-card border-b px-3 md:px-4 py-2 md:py-2.5 flex items-center justify-between sticky-ipad">
      <div className="flex items-center space-x-4">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors"
          aria-label="メニューを開く"
        >
          <span className="text-lg">☰</span>
        </button>
        <div>
          <h2 className="title-ipad md:text-lg font-semibold">Analysis Dashboard</h2>
          <p className="subtitle-ipad md:text-sm text-muted-foreground">
            Spirit in Physics Research Platform
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden md:flex items-center space-x-2 subtitle-ipad md:text-sm text-muted-foreground">
          <span>Powered by Hume AI & Neo4j</span>
          <span>•</span>
          <span>Next.js & TypeScript</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="subtitle-ipad md:text-sm text-muted-foreground">Online</span>
        </div>
      </div>
    </header>
  )
}
