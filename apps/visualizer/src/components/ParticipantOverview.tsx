'use client'

// Merkle DAG: participant_overview -> participants_summary_dashboard
// Participant overview component for dashboard

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Calendar, 
  Activity, 
  TrendingUp, 
  Clock,
  ArrowRight,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

// Merkle DAG: participant_overview -> participant_data_interface
interface ParticipantSummary {
  id: string
  name: string
  sessionCount: number
  responseCount: number
  averageSpiritProbability: number
  lastActivity: string
  hasConsent: boolean
  hasVideoFiles: boolean
  hasHumeData: boolean
}

export function ParticipantOverview() {
  // Merkle DAG: participant_overview -> state_management
  const [participants, setParticipants] = useState<ParticipantSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState({
    totalParticipants: 0,
    totalSessions: 0,
    totalResponses: 0,
    averageSpiritProbability: 0,
    activeParticipants: 0
  })

  // Merkle DAG: participant_overview -> data_fetching
  const fetchParticipants = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/participants')
      if (response.ok) {
        const data = await response.json()
        setParticipants(data)
        
        // Calculate summary
        const totalSessions = data.reduce((sum: number, p: Record<string, unknown>) => sum + ((p.session_count as number) || 0), 0)
        const totalResponses = data.reduce((sum: number, p: Record<string, unknown>) => sum + ((p.total_responses as number) || 0), 0)
        const averageSpiritProbability = data.length > 0 
          ? data.reduce((sum: number, p: Record<string, unknown>) => sum + ((p.average_spirit_probability as number) || 0), 0) / data.length
          : 0
        const activeParticipants = data.filter((p: Record<string, unknown>) => {
          const lastActivity = new Date((p.last_activity as string) || 0)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          return lastActivity > thirtyDaysAgo
        }).length

        setSummary({
          totalParticipants: data.length,
          totalSessions,
          totalResponses,
          averageSpiritProbability,
          activeParticipants
        })
      }
    } catch (error) {
      console.error('Failed to fetch participants:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchParticipants()
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchParticipants, 60000)
    return () => clearInterval(interval)
  }, [fetchParticipants])

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'N/A'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Card key={`loading-card-${i + 1}`}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/4"></div>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={`loading-row-${i + 1}`} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">総参加者数</p>
                <p className="text-2xl font-bold">{summary.totalParticipants}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">総セッション数</p>
                <p className="text-2xl font-bold">{summary.totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">総応答数</p>
                <p className="text-2xl font-bold">{summary.totalResponses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">平均Spirit確率</p>
                <p className="text-2xl font-bold">
                  {(summary.averageSpiritProbability * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">アクティブ参加者</p>
                <p className="text-2xl font-bold">{summary.activeParticipants}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Participants List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>参加者一覧</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchParticipants}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                更新
              </Button>
              <Link href="/participants">
                <Button variant="outline" size="sm">
                  詳細表示
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {participants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                参加者データがありません
              </div>
            ) : (
              participants.map((participant) => (
                <div key={participant.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{participant.name || `Participant ${participant.id}`}</h3>
                        <p className="text-sm text-muted-foreground">
                          ID: {participant.id} • 最終活動: {formatDate(participant.lastActivity)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {participant.sessionCount} セッション
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {participant.responseCount} 応答
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {(participant.averageSpiritProbability * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Spirit確率</div>
                      </div>
                      <div className="flex gap-1">
                        {participant.hasConsent && (
                          <Badge variant="secondary" className="text-xs">同意書</Badge>
                        )}
                        {participant.hasVideoFiles && (
                          <Badge variant="secondary" className="text-xs">動画</Badge>
                        )}
                        {participant.hasHumeData && (
                          <Badge variant="secondary" className="text-xs">感情データ</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}