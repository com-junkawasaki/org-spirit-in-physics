// Merkle DAG: project_layout -> project_ui
// プロジェクトレイアウト（ナビゲーション付き）

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { projectId: string }
}) {
  const pathname = usePathname()
  const projectId = params.projectId

  const navItems = [
    { href: `/projects/${projectId}`, label: 'ダッシュボード' },
    { href: `/projects/${projectId}/participants`, label: 'Spirits' },
    { href: `/projects/${projectId}/config`, label: '設定' },
    { href: `/projects/${projectId}/workflow`, label: 'ワークフロー' },
    { href: `/projects/${projectId}/analysis`, label: '分析' },
    { href: `/projects/${projectId}/reports`, label: 'レポート' },
    { href: `/projects/${projectId}/chat`, label: 'チャット' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ナビゲーション */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link
              href={`/projects/${projectId}`}
              className="text-xl font-semibold text-gray-900"
            >
              プロジェクト
            </Link>
            <div className="flex gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

