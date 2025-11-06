'use client'

import { useQuery, gql } from '@apollo/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Activity, RefreshCw } from 'lucide-react'
import Link from 'next/link'

const SYSTEM_METRICS_QUERY = gql`
  query SystemMetrics {
    participants
    dashboardStats
    # importStatus # This query needs to be created
  }
`;

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
  const { data, loading, error, refetch } = useQuery(SYSTEM_METRICS_QUERY, {
    pollInterval: 60000,
  });

  if (loading && !data) {
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

  if (error) {
    return <div>Error loading metrics.</div>
  }

  const participants = data ? JSON.parse(data.participants) : [];
  const dashboardStats = data ? JSON.parse(data.dashboardStats) : {};
  // const importStatus = data ? JSON.parse(data.importStatus) : {}; // Placeholder

  const metrics: SystemMetricsData = {
    totalParticipants: participants.length,
    totalSessions: participants.reduce((sum: number, p: any) => sum + (p.session_count || 0), 0),
    totalResponses: participants.reduce((sum: number, p: any) => sum + (p.total_responses || 0), 0),
    averageSpiritProbability: dashboardStats.averageSpiritProbability || 0,
    activeJobs: 0, // Mock data, replace with importStatus.activeJobs
    completedJobs: 0, // Mock data, replace with importStatus.completedJobs
    failedJobs: 0, // Mock data, replace with importStatus.failedJobs
    lastAnalysisDate: dashboardStats.lastAnalysisDate
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
              onClick={() => refetch()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
