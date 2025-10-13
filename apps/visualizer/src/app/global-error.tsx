'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8 max-w-md">
            <h1 className="text-4xl font-bold text-destructive mb-4">システムエラー</h1>
            <p className="text-muted-foreground mb-6">
              予期しないエラーが発生しました。ページを再読み込みするか、しばらく経ってから再度お試しください。
            </p>
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              再試行
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
