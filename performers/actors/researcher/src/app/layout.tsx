import { Inter } from 'next/font/google'
import './globals.css'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { MobileMenuOverlay } from '@/components/MobileMenuOverlay'
import { ReactNode } from 'react'
// import { ClerkProvider } from '@clerk/nextjs'

const inter = Inter({ subsets: ['latin'] })

// Merkle DAG: metadata -> seo_and_app_info
export const metadata = {
  title: 'Spirit is Physics',
  description: 'Spirit is Physics Research Platform',
}

// Merkle DAG: root_layout -> main_application_shell
export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-background text-foreground`}>
        {/* Clerk 認証を一時的に無効化 */}
        {/* <ClerkProvider> */}
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
        {/* </ClerkProvider> */}
      </body>
    </html>
  )
}
