import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// Use Inter font with fallback to prevent build-time fetch issues
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'sans-serif']
})

export const metadata: Metadata = {
  title: 'Spirit in Physics - Analysis Dashboard',
  description: 'Interactive visualization dashboard for Spirit in Physics research analysis',
  keywords: ['psychology', 'neuroscience', 'spirit', 'physics', 'emotion', 'analysis'],
  authors: [{ name: 'Jumma Kawasaki' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-background text-foreground`}>
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="border-b bg-card">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold text-primary">
                    Spirit in Physics
                  </h1>
                  <span className="text-sm text-muted-foreground">
                    Analysis Dashboard
                  </span>
                </div>
                <nav className="flex items-center space-x-6">
                  <a
                    href="/participants"
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    被験者一覧
                  </a>
                  <div className="text-sm text-muted-foreground">
                    Real-time Research Analytics
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </nav>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t bg-muted/50">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  © 2024 Spirit in Physics Research. Built with Kawasaki Model.
                </div>
                <div className="flex items-center space-x-4">
                  <span>Powered by Hume AI & Supabase</span>
                  <span>•</span>
                  <span>Next.js & TypeScript</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
