// Merkle DAG: dashboard_page -> system_overview_management
// Main dashboard page for system overview and management

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardLayout } from '@/components/layout/PageLayout'
import { DashboardBreadcrumb } from '@/components/navigation/Breadcrumb'
import { SystemStatusCard } from '@/components/SystemStatusCard'
import { DashboardOverview } from '@/components/DashboardOverview'
import { ImportStatusOverview } from '@/components/ImportStatusOverview'
import { ParticipantOverview } from '@/components/ParticipantOverview'
import { QuickActions } from '@/components/QuickActions'
import { SystemMetrics } from '@/components/SystemMetrics'
import {
  Activity,
  Database,
  Users,
  BarChart3,
  Settings,
  RefreshCw,
  Home,
  Zap,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

// Merkle DAG: dashboard_page -> quick_actions
interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  color: string
}

export default function DashboardPage() {
  const quickActions: QuickAction[] = [
        {
          id: 'data-management',
          title: 'データ管理',
          description: 'データのインポート・分析・管理',
          icon: <Database className="h-6 w-6" />,
          href: '/data-management',
          color: 'bg-blue-500'
        },
        {
          id: 'participants',
          title: '参加者管理',
          description: '参加者データの閲覧・管理',
          icon: <Users className="h-6 w-6" />,
          href: '/participants',
          color: 'bg-indigo-500'
        },
        {
          id: 'analysis',
          title: '分析結果',
          description: 'Spirit確率分析結果の確認',
          icon: <BarChart3 className="h-6 w-6" />,
          href: '/analysis',
          color: 'bg-purple-500'
        },
        {
          id: 'system-metrics',
          title: 'システム指標',
          description: 'システムパフォーマンスの監視',
          icon: <TrendingUp className="h-6 w-6" />,
          href: '/system-metrics',
          color: 'bg-green-500'
        }
      ]

  const handleRefresh = () => {
    // Refresh dashboard data
    window.location.reload()
  }

  return (
    <DashboardLayout
      header={{
        title: 'ダッシュボード',
        description: 'Spirit in Physics実験システムの総合管理画面',
        icon: <Home className="h-8 w-8" />,
        actions: (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Zap className="h-4 w-4 mr-2" />
              クイック診断
            </Button>
            <Link href="/data-management">
              <Button size="sm">
                <Database className="h-4 w-4 mr-2" />
                データ管理へ
              </Button>
            </Link>
          </div>
        )
      }}
      onRefresh={handleRefresh}
    >
      <DashboardBreadcrumb />

      {/* System Status Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SystemStatusCard />
        <SystemMetrics />
      </div>

      {/* Quick Actions Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            クイックアクション
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            よく使う機能に素早くアクセス
          </p>
        </CardHeader>
        <CardContent>
          <QuickActions actions={quickActions} />
        </CardContent>
      </Card>

      {/* Detailed Overview Tabs */}
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                概要
              </TabsTrigger>
              <TabsTrigger value="participants" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                参加者
              </TabsTrigger>
              <TabsTrigger value="imports" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                インポート
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                分析
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <DashboardOverview />
            </TabsContent>

            <TabsContent value="participants" className="space-y-6">
              <ParticipantOverview />
            </TabsContent>

            <TabsContent value="imports" className="space-y-6">
              <ImportStatusOverview />
            </TabsContent>

            <TabsContent value="analysis" className="space-y-6">
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">分析結果</h3>
                <p className="text-muted-foreground mb-4">
                  分析結果の詳細表示機能は開発中です
                </p>
                <Link href="/data-management">
                  <Button>
                    <Database className="h-4 w-4 mr-2" />
                    データ管理で分析を開始
                  </Button>
                </Link>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
