import type { Metadata } from 'next'
import './globals.css'

// Use system fonts to avoid Google Fonts fetch during build
const inter = {
  className: 'font-sans',
  style: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }
}

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
                  <a
                    href="/analysis"
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    分析
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
                  <span>Powered by Hume AI & ArangoDB</span>
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
