'use client'

import { useSidebar } from '@/contexts/SidebarContext'

export function MobileMenuOverlay() {
  const { mobileMenuOpen, setMobileMenuOpen } = useSidebar()

  if (!mobileMenuOpen) return null

  return (
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
  )
}

