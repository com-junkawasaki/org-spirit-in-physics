'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ParticipantData, AnalysisResult } from '@/lib/data'
import {
  Calendar,
  Clock,
  TrendingUp,
  Activity,
  Users
} from 'lucide-react'

async function getParticipantAnalysis(id: string): Promise<AnalysisResult[]> {
  try {
    const response = await fetch(`/api/analysis-results?participantId=${id}`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      return []
    }

    return response.json()
  } catch (error) {
    console.error('Failed to fetch analysis results:', error)
    return []
  }
}

function formatDate(timestamp: number | null | string): string {
  if (!timestamp) return 'N/A'

  try {
    const date = typeof timestamp === 'string'
      ? new Date(timestamp)
      : new Date(timestamp)

    if (Number.isNaN(date.getTime())) {
      return 'N/A'
    }

    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'N/A'
  }
}

export default function ParticipantOverview({ participant }: { participant: ParticipantData }) {
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnalysisResults() {
      console.log('Fetching analysis results for participant:', participant.id)
      try {
        const results = await getParticipantAnalysis(participant.id)
        console.log('Analysis results:', results)
        setAnalysisResults(results)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching analysis results:', error)
        setAnalysisResults([])
        setLoading(false)
      }
    }

    fetchAnalysisResults()
  }, [participant.id])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={`loading-metric-${i + 1}`}>
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
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const averageReactionTime = analysisResults.length > 0
    ? analysisResults.reduce((sum, result) => sum + (result.reaction_time_ms || 0), 0) / analysisResults.length
    : 0

  const topEmotions = analysisResults.length > 0
    ? Object.entries(
        analysisResults.reduce((acc, result) => {
          Object.entries(result.emotion_data).forEach(([emotion, value]) => {
            acc[emotion] = (acc[emotion] || 0) + value
          })
          return acc
        }, {} as Record<string, number>)
      )
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
    : []

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">平均Spirit確率</p>
                <p className="text-2xl font-bold">
                  {(participant.averageSpiritProbability * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">平均反応時間</p>
                <p className="text-2xl font-bold">
                  {averageReactionTime.toFixed(0)}ms
                </p>
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
                <p className="text-2xl font-bold">{participant.responseCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">セッション数</p>
                <p className="text-2xl font-bold">{participant.sessionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Overview */}
      <Card>
        <CardHeader>
          <CardTitle>実験セッション</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {participant.sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{session.session_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(session.start_time)}
                      {session.end_time && ` - ${formatDate(session.end_time)}`}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">
                  {session.responseCount} 応答
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Emotions */}
      {topEmotions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>主な感情パターン</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topEmotions.map(([emotion, totalScore]) => (
                <div key={emotion} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{emotion}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${Math.min((totalScore / analysisResults.length) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {(totalScore / analysisResults.length).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
