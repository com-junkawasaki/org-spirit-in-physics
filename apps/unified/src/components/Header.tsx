'use client'

import { useSidebar } from '@/contexts/SidebarContext'
// import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'

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
        {/* タイトルブロックはiPadでは冗長のため削除し、情報密度を最適化 */}
      </div>
      {/* Clerk 認証を一時的に無効化 */}
      {/* <div className="flex items-center space-x-4">
        <SignedOut>
          <SignInButton mode="modal" />
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div> */}
    </header>
  )
}

