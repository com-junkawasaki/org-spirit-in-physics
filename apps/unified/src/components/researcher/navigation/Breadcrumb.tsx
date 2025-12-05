'use client'

import { ChevronRight, Home } from 'lucide-react'
// import Link from 'next/link' // Removed: Next.js specific
import { cn } from '../../../lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      className={cn("flex items-center space-x-1 text-sm text-muted-foreground mb-6", className)}
      aria-label="Breadcrumb"
    >
      <a
        href="/researcher/dashboard"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4 mr-1" />
        <span className="sr-only">ホーム</span>
      </a>

      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50" />

          {item.href ? (
            <a
              href={item.href}
              className="flex items-center hover:text-foreground transition-colors"
            >
              {item.icon && <span className="mr-1">{item.icon}</span>}
              {item.label}
            </a>
          ) : (
            <span className="flex items-center text-foreground font-medium">
              {item.icon && <span className="mr-1">{item.icon}</span>}
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}

// 特定のページ用のBreadcrumbヘルパー
export function DashboardBreadcrumb() {
  return (
    <Breadcrumb items={[]} />
  )
}

export function DataManagementBreadcrumb() {
  return (
    <Breadcrumb items={[
      { label: 'データ管理', icon: <span className="text-primary">📊</span> }
    ]} />
  )
}

export function AnalysisBreadcrumb({ runId }: { runId?: string }) {
  const items: BreadcrumbItem[] = [
    { label: '分析', icon: <span className="text-purple-500">📈</span> }
  ]

  if (runId) {
    items.push({ label: `実行 ${runId}`, href: `/analysis/${runId}` })
    items.push({ label: 'パイプライン' })
  }

  return <Breadcrumb items={items} />
}

export function ImportBreadcrumb({ jobId }: { jobId?: string }) {
  const items: BreadcrumbItem[] = [
    { label: 'インポート', icon: <span className="text-green-500">📥</span> }
  ]

  if (jobId) {
    items.push({ label: `ジョブ ${jobId}` })
  }

  return <Breadcrumb items={items} />
}

export function ParticipantsBreadcrumb({ participantId }: { participantId?: string }) {
  const items: BreadcrumbItem[] = [
    { label: '参加者', icon: <span className="text-blue-500">👥</span> }
  ]

  if (participantId) {
    items.push({ label: `参加者 ${participantId}` })
  }

  return <Breadcrumb items={items} />
}

// Default export for Astro compatibility
export default ParticipantsBreadcrumb;
