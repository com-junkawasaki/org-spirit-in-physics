'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Activity, RefreshCw } from 'lucide-react'
// import Link from 'next/link' // Removed: Next.js specific

interface SystemMetricsData {
  totalParticipants: number
  totalSessions: number
  totalResponses: number
  averageSpiritProbability: number
  activeJobs: number
  completedJobs: number
  failedJobs: number
  lastAnalysisDate?: string
}

export function SystemMetrics() {
  const [metrics, setMetrics] = useState<SystemMetricsData>({
    totalParticipants: 0,
    totalSessions: 0,
    totalResponses: 0,
    averageSpiritProbability: 0,
    activeJobs: 0,
    completedJobs: 0,
    failedJobs: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  const fetchMetrics = async () => {
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
      console.error('Failed to fetch dashboard metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 60000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
        <Card className="p-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    システムメトリクス
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center h-24">
                    <div>読み込み中...</div>
                </div>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="p-6">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                システムメトリクス
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMetrics}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              更新
            </Button>
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
  )
}
