'use client'

// Merkle DAG: dashboard_page -> system_overview_management
// Main dashboard page for system overview and management

import { useState, useEffect } from 'react'
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

// Merkle DAG: dashboard_page -> system_metrics
interface SystemMetrics {
  totalParticipants: number
  totalSessions: number
  totalResponses: number
  averageSpiritProbability: number
  activeJobs: number
  completedJobs: number
  failedJobs: number
  lastAnalysisDate?: string
}

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
  // Merkle DAG: dashboard_page -> state_management
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalParticipants: 0,
    totalSessions: 0,
    totalResponses: 0,
    averageSpiritProbability: 0,
    activeJobs: 0,
    completedJobs: 0,
    failedJobs: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  // Merkle DAG: dashboard_page -> data_fetching
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [participantsResponse, dashboardStatsResponse, importStatusResponse] = await Promise.all([
          fetch('/api/participants'),
          fetch('/api/dashboard-stats'),
          fetch('/api/imports/status')
        ])

        const participants = participantsResponse.ok ? await participantsResponse.json() : []
        const dashboardStats = dashboardStatsResponse.ok ? await dashboardStatsResponse.json() : {}
        const importStatus = importStatusResponse.ok ? await importStatusResponse.json() : {}

        setMetrics({
          totalParticipants: participants.length,
          totalSessions: participants.reduce((sum: number, p: Record<string, unknown>) => sum + ((p.session_count as number) || 0), 0),
          totalResponses: participants.reduce((sum: number, p: Record<string, unknown>) => sum + ((p.total_responses as number) || 0), 0),
          averageSpiritProbability: dashboardStats.averageSpiritProbability || 0,
          activeJobs: importStatus.activeJobs || 0,
          completedJobs: importStatus.completedJobs || 0,
          failedJobs: importStatus.failedJobs || 0,
          lastAnalysisDate: dashboardStats.lastAnalysisDate
        })
      } catch (error) {
        console.error('Failed to fetch dashboard metrics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchMetrics, 60000)
    return () => clearInterval(interval)
  }, [])

  // Merkle DAG: dashboard_page -> quick_actions_config
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

  // Merkle DAG: dashboard_page -> refresh_handler
  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const [participantsResponse, dashboardStatsResponse, importStatusResponse] = await Promise.all([
        fetch('/api/participants'),
        fetch('/api/dashboard-stats'),
        fetch('/api/imports/status')
      ])

      const participants = participantsResponse.ok ? await participantsResponse.json() : []
      const dashboardStats = dashboardStatsResponse.ok ? await dashboardStatsResponse.json() : {}
      const importStatus = importStatusResponse.ok ? await importStatusResponse.json() : {}

      setMetrics({
        totalParticipants: participants.length,
        totalSessions: participants.reduce((sum: number, p: Record<string, unknown>) => sum + ((p.session_count as number) || 0), 0),
        totalResponses: participants.reduce((sum: number, p: Record<string, unknown>) => sum + ((p.total_responses as number) || 0), 0),
        averageSpiritProbability: dashboardStats.averageSpiritProbability || 0,
        activeJobs: importStatus.activeJobs || 0,
        completedJobs: importStatus.completedJobs || 0,
        failedJobs: importStatus.failedJobs || 0,
        lastAnalysisDate: dashboardStats.lastAnalysisDate
      })
    } catch (error) {
      console.error('Failed to refresh dashboard metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">ダッシュボードを読み込み中...</div>
        </div>
      </div>
    )
  }

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
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              更新
            </Button>
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
        
        <Card className="p-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              システムメトリクス
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{metrics.totalParticipants}</div>
                <div className="text-sm text-muted-foreground">参加者数</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{metrics.totalSessions}</div>
                <div className="text-sm text-muted-foreground">セッション数</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{metrics.totalResponses}</div>
                <div className="text-sm text-muted-foreground">応答数</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {metrics.averageSpiritProbability.toFixed(3)}
                </div>
                <div className="text-sm text-muted-foreground">平均Spirit確率</div>
              </div>
            </div>
            {metrics.lastAnalysisDate && (
              <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                最終分析: {new Date(metrics.lastAnalysisDate).toLocaleString('ja-JP')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Merkle DAG: dashboard_page -> quick_actions_section */}
      <Card className="p-6 mb-8">
        <CardHeader>
          <CardTitle>クイックアクション</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.id} href={action.href}>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${action.color} text-white`}>
                      {action.icon}
                    </div>
                    <div>
                      <h3 className="font-medium">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
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
