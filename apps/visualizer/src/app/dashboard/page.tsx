// Merkle DAG: dashboard_page -> system_overview_management
// Main dashboard page for system overview and management

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SystemStatusCard } from '@/components/SystemStatusCard'
import { DashboardOverview } from '@/components/DashboardOverview'
import { ImportStatusOverview } from '@/components/ImportStatusOverview'
import { ParticipantOverview } from '@/components/ParticipantOverview'
import { 
  Activity, 
  Database, 
  Users, 
  BarChart3, 
  Settings, 
  RefreshCw,
  ArrowLeft,
  Home
} from 'lucide-react'
import Link from 'next/link'
import { QuickActions } from '@/components/QuickActions'
import { SystemMetrics } from '@/components/SystemMetrics'

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
          id: 'participants',
          title: '参加者管理',
          description: '参加者データの閲覧・管理',
          icon: <Users className="h-6 w-6" />,
          href: '/participants',
          color: 'bg-blue-500'
        },
        {
          id: 'imports',
          title: 'データインポート',
          description: '実験データのインポート管理',
          icon: <Database className="h-6 w-6" />,
          href: '/imports',
          color: 'bg-green-500'
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
          id: 'settings',
          title: 'システム設定',
          description: 'システム設定・構成管理',
          icon: <Settings className="h-6 w-6" />,
          href: '/settings',
          color: 'bg-gray-500'
        }
      ]

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Merkle DAG: dashboard_page -> page_header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-2">
              <Home className="h-8 w-8" />
              ダッシュボード
            </h1>
            <p className="text-muted-foreground">
              Spirit in Physics実験システムの総合管理画面
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/imports">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                インポート管理
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Merkle DAG: dashboard_page -> system_status_section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SystemStatusCard />
        <SystemMetrics />
      </div>

      {/* Merkle DAG: dashboard_page -> quick_actions_section */}
      <Card className="p-6 mb-8">
        <CardHeader>
          <CardTitle>クイックアクション</CardTitle>
        </CardHeader>
        <CardContent>
          <QuickActions actions={quickActions} />
        </CardContent>
      </Card>
      
      {/* Merkle DAG: dashboard_page -> detailed_tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="participants">参加者</TabsTrigger>
          <TabsTrigger value="imports">インポート</TabsTrigger>
          <TabsTrigger value="analysis">分析</TabsTrigger>
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
          <Card className="p-6">
            <CardHeader>
              <CardTitle>分析結果</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                分析結果の詳細表示機能は開発中です
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
