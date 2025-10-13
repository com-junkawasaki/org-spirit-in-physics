'use client'

import './globals.css'
import { useState } from 'react'

// Use system fonts to avoid Google Fonts fetch during build
const inter = {
  className: 'font-sans',
  style: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }
}

// Merkle DAG: sidebar_layout -> navigation_menu_structure
interface MenuItem {
  id: string
  label: string
  href: string
  icon: string
  description: string
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'ダッシュボード',
    href: '/dashboard',
    icon: '📊',
    description: 'システム概要と統計'
  },
  {
    id: 'participants',
    label: '被験者一覧',
    href: '/participants',
    icon: '👥',
    description: '参加者データ管理'
  },
  {
    id: 'analysis',
    label: '分析',
    href: '/analysis',
    icon: '🔬',
    description: 'データ分析と可視化'
  },
  {
    id: 'imports',
    label: 'インポート管理',
    href: '/imports',
    icon: '📥',
    description: 'データインポート処理'
  }
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Merkle DAG: sidebar_layout -> sidebar_state_management
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-background text-foreground`}>
        <div className="min-h-screen flex">
          {/* Merkle DAG: sidebar_layout -> sidebar_navigation */}
          <aside className={`
            ${sidebarOpen ? 'w-64' : 'w-16'} 
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            fixed lg:static inset-y-0 left-0 z-50 
            bg-card border-r transition-all duration-300 ease-in-out
            flex flex-col
          `}>
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b">
              {sidebarOpen && (
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold text-primary">
                    Spirit in Physics
                  </h1>
                </div>
              )}
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md hover:bg-muted transition-colors"
                aria-label={sidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
              >
                <span className="text-lg">
                  {sidebarOpen ? '◀' : '▶'}
                </span>
              </button>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 p-4 space-y-2">
              {menuItems.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  className={`
                    flex items-center space-x-3 p-3 rounded-lg
                    hover:bg-muted transition-colors group
                    ${sidebarOpen ? 'justify-start' : 'justify-center'}
                  `}
                  title={sidebarOpen ? '' : item.description}
                >
                  <span className="text-xl">{item.icon}</span>
                  {sidebarOpen && (
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </div>
                    </div>
                  )}
                </a>
              ))}
            </nav>

            {/* Sidebar Footer */}
            <div className="p-4 border-t">
              {sidebarOpen ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-muted-foreground">
                      Real-time Analytics
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    © 2024 Spirit in Physics Research
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Header */}
            <header className="bg-card border-b px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors"
                  aria-label="メニューを開く"
                >
                  <span className="text-lg">☰</span>
                </button>
                <div>
                  <h2 className="text-lg font-semibold">Analysis Dashboard</h2>
                  <p className="text-sm text-muted-foreground">
                    Spirit in Physics Research Platform
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>Powered by Hume AI & ArangoDB</span>
                  <span>•</span>
                  <span>Next.js & TypeScript</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted-foreground">Online</span>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
              <div className="h-full">
                {children}
              </div>
            </main>
          </div>

          {/* Mobile Menu Overlay */}
          {mobileMenuOpen && (
            <button
              type="button"
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setMobileMenuOpen(false)
                }
              }}
              aria-label="メニューを閉じる"
            />
          )}
        </div>
      </body>
    </html>
  )
}
