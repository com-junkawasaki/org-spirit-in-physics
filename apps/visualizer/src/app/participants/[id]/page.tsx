'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Brain,
  TrendingUp,
  Activity,
  BarChart3,
  Users,
  Target
} from 'lucide-react'

interface Participant {
  id: string
  name: string
  sessionCount: number
  responseCount: number
  averageSpiritProbability: number
  lastActivity: number | null
  sessions: Array<{
    id: string
    sessionType: string
    startTime: string
    endTime: string | null
    responseCount: number
  }>
}

interface AnalysisResult {
  id: string
  stimulus_word: string
  response_word: string
  p_value: number
  reaction_time_ms?: number
  emotion_data: Record<string, number>
  created_at: string
  word2vec_component: number
  reaction_time_component: number
  skin_potential_component: number
  emotion_component: number
  physiological_data: any
}

async function getParticipant(id: string): Promise<Participant | null> {
  try {
    const response = await fetch(`/api/participants/${id}`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Failed to fetch participant')
    }

    return response.json()
  } catch (error) {
    console.error('Failed to fetch participant:', error)
    return null
  }
}

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

  const date = typeof timestamp === 'string'
    ? new Date(timestamp)
    : new Date(timestamp)

  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getSpiritProbabilityColor(probability: number): string {
  if (probability >= 0.99) return 'bg-green-100 text-green-800 border-green-200'
  if (probability >= 0.95) return 'bg-blue-100 text-blue-800 border-blue-200'
  if (probability >= 0.90) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  return 'bg-red-100 text-red-800 border-red-200'
}

function SpiritProbabilityBadge({ probability }: { probability: number }) {
  return (
    <Badge className={`${getSpiritProbabilityColor(probability)} border`}>
      <Target className="h-3 w-3 mr-1" />
      {(probability * 100).toFixed(4)}%
    </Badge>
  )
}

function OverviewTab({ participant, analysisResults }: { participant: Participant, analysisResults: AnalysisResult[] }) {
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
                    <p className="font-medium">{session.sessionType}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(session.startTime)}
                      {session.endTime && ` - ${formatDate(session.endTime)}`}
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

function ResultsTab({ analysisResults }: { analysisResults: AnalysisResult[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">分析結果一覧</h3>
        <Badge variant="secondary">
          {analysisResults.length} 件の結果
        </Badge>
      </div>

      <div className="space-y-4">
        {analysisResults.map((result) => (
          <Card key={result.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="text-lg font-bold">
                    "{result.stimulus_word}" → "{result.response_word}"
                  </div>
                  <SpiritProbabilityBadge probability={result.p_value} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(result.created_at)}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">反応時間</div>
                  <div className="text-lg font-semibold">{result.reaction_time_ms || 0}ms</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Word2Vec</div>
                  <div className="text-lg font-semibold">{result.word2vec_component.toFixed(3)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">皮膚電位</div>
                  <div className="text-lg font-semibold">{result.skin_potential_component.toFixed(3)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">感情</div>
                  <div className="text-lg font-semibold">{result.emotion_component.toFixed(3)}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm text-muted-foreground mb-2">感情スコア</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(result.emotion_data)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 6)
                    .map(([emotion, score]) => (
                      <Badge key={emotion} variant="outline" className="text-xs">
                        {emotion}: {(score * 100).toFixed(1)}%
                      </Badge>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
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

export default function ParticipantDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchParticipant() {
      const data = await getParticipant(id)
      setParticipant(data)
      setLoading(false)
    }

    if (id) {
      fetchParticipant()
    }
  }, [id])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (!participant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">参加者が見つかりません</h3>
          <p className="text-sm text-muted-foreground mt-2">
            指定された参加者は存在しないか、削除された可能性があります。
          </p>
          <div className="mt-6">
            <Link href="/participants">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                被験者一覧に戻る
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex gap-4 mb-4">
          <Link href="/participants">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              被験者一覧に戻る
            </Button>
          </Link>
          <Link href={`/participants/${participant.id}/timeline`}>
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              時系列分析
            </Button>
          </Link>
          <Link href={`/participants/${participant.id}/correlation`}>
            <Button variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              相関分析
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {participant.name || `参加者 ${participant.id.slice(0, 8)}`}
            </h1>
            <p className="text-muted-foreground">
              被験者ID: {participant.id}
            </p>
          </div>
          <SpiritProbabilityBadge probability={participant.averageSpiritProbability} />
        </div>
      </div>

      {/* Content */}
      <Suspense fallback={<LoadingSkeleton />}>
        <ParticipantDetailContent participant={participant} />
      </Suspense>
    </div>
  )
}

function ParticipantDetailContent({ participant }: { participant: Participant }) {
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnalysisResults() {
      const results = await getParticipantAnalysis(participant.id)
      setAnalysisResults(results)
      setLoading(false)
    }

    fetchAnalysisResults()
  }, [participant.id])

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="overview">概要</TabsTrigger>
        <TabsTrigger value="results">詳細結果</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab participant={participant} analysisResults={analysisResults} />
      </TabsContent>

      <TabsContent value="results">
        <ResultsTab analysisResults={analysisResults} />
      </TabsContent>
    </Tabs>
  )
}
