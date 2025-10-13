'use client'

// Merkle DAG: system_metrics_page -> metrics_dashboard_component
// Single responsibility: Display comprehensive system metrics dashboard
// Open/Closed: Extensible for new metric types and visualizations
// Liskov Substitution: Implements DashboardComponent interface
// Interface Segregation: Focused on metrics display and interaction only
// Dependency Inversion: Depends on metrics interfaces, not concrete implementations

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SystemMetricsCard, type SystemMetric } from '@/components/SystemMetricsCard'
import { SystemHealthIndicator, type HealthStatus } from '@/components/SystemHealthIndicator'
import { PerformanceChart, type PerformanceMetric } from '@/components/PerformanceChart'
import { 
  RefreshCw,
  Settings,
  TrendingUp,
  Users,
  Activity,
  BarChart3,
  Clock,
  Server,
  Monitor
} from 'lucide-react'

// Merkle DAG: system_metrics_page -> metrics_data_interface
interface SystemMetricsData {
  timestamp: string
  participants: {
    total: number
    active: number
    completed: number
  }
  sessions: {
    total: number
    active: number
    completed: number
  }
  responses: {
    total: number
    averageSpiritProbability: number
    processed: number
    pending: number
  }
  jobs: {
    active: number
    completed: number
    failed: number
    total: number
  }
  performance: {
    averageResponseTime: number
    databaseConnections: number
    memoryUsage: number
    cpuUsage: number
  }
  health: {
    overall: 'healthy' | 'degraded' | 'critical'
    services: Array<{
      name: string
      status: 'healthy' | 'degraded' | 'critical'
      responseTime: number
      lastChecked: string
    }>
  }
}

// Merkle DAG: system_metrics_page -> performance_data_interface
interface PerformanceMetricsData {
  timestamp: string
  metrics: PerformanceMetric[]
  timeRange: string
}

// Merkle DAG: system_metrics_page -> main_component
export default function SystemMetricsPage() {
  // Merkle DAG: system_metrics_page -> state_management
  const [systemMetrics, setSystemMetrics] = useState<SystemMetricsData | null>(null)
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetricsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  // Merkle DAG: system_metrics_page -> data_fetching
  const fetchSystemMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/system-metrics')
      if (response.ok) {
        const data = await response.json()
        setSystemMetrics(data)
        setLastUpdated(new Date())
      } else {
        console.error('Failed to fetch system metrics')
      }
    } catch (error) {
      console.error('Error fetching system metrics:', error)
    }
  }, [])

  const fetchPerformanceMetrics = useCallback(async () => {
    try {
      const response = await fetch(`/api/system-metrics/performance?timeRange=${selectedTimeRange}`)
      if (response.ok) {
        const data = await response.json()
        setPerformanceMetrics(data)
      } else {
        console.error('Failed to fetch performance metrics')
      }
    } catch (error) {
      console.error('Error fetching performance metrics:', error)
    }
  }, [selectedTimeRange])

  const fetchAllMetrics = useCallback(async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        fetchSystemMetrics(),
        fetchPerformanceMetrics()
      ])
    } finally {
      setIsLoading(false)
    }
  }, [fetchSystemMetrics, fetchPerformanceMetrics])

  // Merkle DAG: system_metrics_page -> effect_hooks
  useEffect(() => {
    fetchAllMetrics()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAllMetrics, 30000)
    return () => clearInterval(interval)
  }, [fetchAllMetrics])

  useEffect(() => {
    fetchPerformanceMetrics()
  }, [fetchPerformanceMetrics])

  // Merkle DAG: system_metrics_page -> metrics_transformation
  const transformToSystemMetrics = (data: SystemMetricsData): SystemMetric[] => {
    return [
      {
        id: 'participants-total',
        label: '総参加者数',
        value: data.participants.total,
        unit: '人',
        trend: 'stable',
        status: 'healthy',
        description: '登録済み参加者数',
        icon: <Users className="h-4 w-4" />,
        color: 'bg-blue-50'
      },
      {
        id: 'sessions-total',
        label: '総セッション数',
        value: data.sessions.total,
        unit: '件',
        trend: 'stable',
        status: 'healthy',
        description: '実行済みセッション数',
        icon: <Activity className="h-4 w-4" />,
        color: 'bg-green-50'
      },
      {
        id: 'responses-total',
        label: '総応答数',
        value: data.responses.total,
        unit: '件',
        trend: 'stable',
        status: 'healthy',
        description: '収集済み応答数',
        icon: <BarChart3 className="h-4 w-4" />,
        color: 'bg-purple-50'
      },
      {
        id: 'spirit-probability',
        label: '平均Spirit確率',
        value: data.responses.averageSpiritProbability,
        unit: '',
        trend: 'stable',
        status: 'healthy',
        description: '全応答の平均Spirit確率',
        icon: <TrendingUp className="h-4 w-4" />,
        color: 'bg-orange-50'
      },
      {
        id: 'active-jobs',
        label: 'アクティブジョブ',
        value: data.jobs.active,
        unit: '件',
        trend: 'stable',
        status: data.jobs.active > 10 ? 'warning' : 'healthy',
        description: '実行中のジョブ数',
        icon: <Clock className="h-4 w-4" />,
        color: 'bg-yellow-50'
      },
      {
        id: 'failed-jobs',
        label: '失敗ジョブ',
        value: data.jobs.failed,
        unit: '件',
        trend: 'stable',
        status: data.jobs.failed > 0 ? 'critical' : 'healthy',
        description: '失敗したジョブ数',
        icon: <Server className="h-4 w-4" />,
        color: 'bg-red-50'
      }
    ]
  }

  const transformToHealthStatuses = (data: SystemMetricsData): HealthStatus[] => {
    return data.health.services.map(service => ({
      service: service.name,
      status: service.status,
      message: `${service.name}サービスが${service.status === 'healthy' ? '正常' : '異常'}です`,
      responseTime: service.responseTime,
      lastChecked: new Date(service.lastChecked)
    }))
  }

  // Merkle DAG: system_metrics_page -> refresh_handler
  const handleRefresh = async () => {
    await fetchAllMetrics()
  }

  // Merkle DAG: system_metrics_page -> time_range_handler
  const handleTimeRangeChange = (timeRange: '1h' | '24h' | '7d' | '30d') => {
    setSelectedTimeRange(timeRange)
  }

  if (isLoading && !systemMetrics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">システムメトリクスを読み込み中...</div>
        </div>
      </div>
    )
  }

  if (!systemMetrics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-500">システムメトリクスの取得に失敗しました</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Merkle DAG: system_metrics_page -> page_header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-2">
              <Monitor className="h-8 w-8" />
              システムメトリクス
            </h1>
            <p className="text-muted-foreground">
              Spirit in Physics実験システムの包括的なパフォーマンス監視
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
            {lastUpdated && (
              <div className="text-xs text-muted-foreground">
                最終更新: {lastUpdated.toLocaleTimeString('ja-JP')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Merkle DAG: system_metrics_page -> main_tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="health">ヘルス</TabsTrigger>
          <TabsTrigger value="performance">パフォーマンス</TabsTrigger>
          <TabsTrigger value="details">詳細</TabsTrigger>
        </TabsList>

        {/* Merkle DAG: system_metrics_page -> overview_tab */}
        <TabsContent value="overview" className="space-y-6">
          <SystemMetricsCard
            title="システムメトリクス"
            metrics={transformToSystemMetrics(systemMetrics)}
            isLoading={isLoading}
            lastUpdated={lastUpdated}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SystemHealthIndicator
              healthStatuses={transformToHealthStatuses(systemMetrics)}
              overallStatus={systemMetrics.health.overall}
              isLoading={isLoading}
              lastUpdated={lastUpdated}
            />
            
            <Card className="p-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  システム設定
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium mb-2">時間範囲</div>
                    <div className="flex gap-2">
                      {(['1h', '24h', '7d', '30d'] as const).map((range) => (
                        <Button
                          key={range}
                          variant={selectedTimeRange === range ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleTimeRangeChange(range)}
                        >
                          {range}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <div>データベース接続: {systemMetrics.performance.databaseConnections}件</div>
                    <div>メモリ使用率: {systemMetrics.performance.memoryUsage.toFixed(1)}%</div>
                    <div>CPU使用率: {systemMetrics.performance.cpuUsage.toFixed(1)}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Merkle DAG: system_metrics_page -> health_tab */}
        <TabsContent value="health" className="space-y-6">
          <SystemHealthIndicator
            healthStatuses={transformToHealthStatuses(systemMetrics)}
            overallStatus={systemMetrics.health.overall}
            isLoading={isLoading}
            lastUpdated={lastUpdated}
            className="w-full"
          />
        </TabsContent>

        {/* Merkle DAG: system_metrics_page -> performance_tab */}
        <TabsContent value="performance" className="space-y-6">
          {performanceMetrics && (
            <PerformanceChart
              title="パフォーマンスメトリクス"
              metrics={performanceMetrics.metrics}
              isLoading={isLoading}
              timeRange={selectedTimeRange}
            />
          )}
        </TabsContent>

        {/* Merkle DAG: system_metrics_page -> details_tab */}
        <TabsContent value="details" className="space-y-6">
          <Card className="p-6">
            <CardHeader>
              <CardTitle>詳細メトリクス</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">参加者統計</h4>
                  <div className="space-y-1 text-sm">
                    <div>総数: {systemMetrics.participants.total}人</div>
                    <div>アクティブ: {systemMetrics.participants.active}人</div>
                    <div>完了: {systemMetrics.participants.completed}人</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">セッション統計</h4>
                  <div className="space-y-1 text-sm">
                    <div>総数: {systemMetrics.sessions.total}件</div>
                    <div>アクティブ: {systemMetrics.sessions.active}件</div>
                    <div>完了: {systemMetrics.sessions.completed}件</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">応答統計</h4>
                  <div className="space-y-1 text-sm">
                    <div>総数: {systemMetrics.responses.total}件</div>
                    <div>処理済み: {systemMetrics.responses.processed}件</div>
                    <div>待機中: {systemMetrics.responses.pending}件</div>
                    <div>平均Spirit確率: {systemMetrics.responses.averageSpiritProbability.toFixed(4)}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">ジョブ統計</h4>
                  <div className="space-y-1 text-sm">
                    <div>総数: {systemMetrics.jobs.total}件</div>
                    <div>アクティブ: {systemMetrics.jobs.active}件</div>
                    <div>完了: {systemMetrics.jobs.completed}件</div>
                    <div>失敗: {systemMetrics.jobs.failed}件</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
