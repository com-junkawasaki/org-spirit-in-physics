'use client'

import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface PageHeaderProps {
  title: string
  description?: string
  icon?: ReactNode
  backHref?: string
  backLabel?: string
  actions?: ReactNode
  badge?: {
    text: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  }
}

interface PageLayoutProps {
  children: ReactNode
  header: PageHeaderProps
  className?: string
  isLoading?: boolean
  onRefresh?: () => void
}

function PageHeader({ header, onRefresh }: { header: PageHeaderProps; onRefresh?: () => void }) {
  return (
    <div className="mb-6 md:mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          {header.backHref && (
            <Link href={header.backHref}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {header.backLabel || '戻る'}
              </Button>
            </Link>
          )}

          <div>
            <div className="flex items-center gap-2.5 md:gap-3 mb-1.5 md:mb-2">
              {header.icon && <div className="text-primary">{header.icon}</div>}
              <h1 className="title-ipad md:text-2xl lg:text-3xl font-bold text-primary">{header.title}</h1>
              {header.badge && (
                <Badge variant={header.badge.variant || 'default'}>
                  {header.badge.text}
                </Badge>
              )}
            </div>
            {header.description && (
              <p className="subtitle-ipad md:text-base text-muted-foreground max-w-2xl">
                {header.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              更新
            </Button>
          )}
          {header.actions}
        </div>
      </div>
    </div>
  )
}

export function PageLayout({ children, header, className = '', isLoading = false, onRefresh }: PageLayoutProps) {
  return (
    <div className={`container container-ipad mx-auto px-3 md:px-4 py-4 md:py-6 ${className}`}>
      <PageHeader header={header} onRefresh={onRefresh} />

      {isLoading ? (
        <Card className="p-6 md:p-8">
          <CardContent className="flex items-center justify-center min-h-[160px] md:min-h-[200px]">
            <div className="text-center">
              <RefreshCw className="h-6 w-6 md:h-8 md:w-8 animate-spin mx-auto mb-3 md:mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">読み込み中...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        children
      )}
    </div>
  )
}

// 特定のページタイプ用のレイアウト
export function DashboardLayout({ children, header, onRefresh }: Omit<PageLayoutProps, 'className'>) {
  return (
    <PageLayout
      header={header}
      onRefresh={onRefresh}
      className="max-w-6xl md:max-w-7xl"
    >
      {children}
    </PageLayout>
  )
}

export function DataManagementLayout({ children, header, onRefresh }: Omit<PageLayoutProps, 'className'>) {
  return (
    <PageLayout
      header={header}
      onRefresh={onRefresh}
      className="max-w-5xl md:max-w-6xl"
    >
      {children}
    </PageLayout>
  )
}

export function AnalysisLayout({ children, header, onRefresh }: Omit<PageLayoutProps, 'className'>) {
  return (
    <PageLayout
      header={header}
      onRefresh={onRefresh}
      className="max-w-4xl md:max-w-5xl"
    >
      {children}
    </PageLayout>
  )
}
