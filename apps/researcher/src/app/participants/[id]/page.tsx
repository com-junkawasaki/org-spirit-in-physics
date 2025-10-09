import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
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
  stimulusWord: string
  responseWord: string
  spiritProbability: number
  reactionTime: number
  emotionData: Record<string, number>
  timestamp: string
  components: {
    word2vec: number
    reaction_time: number
    skin_potential: number
    emotion: number
  }
}

async function getParticipant(id: string): Promise<Participant | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/participants`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error('Failed to fetch participants')
    }

    const participants: Participant[] = await response.json()
    return participants.find(p => p.id === id) || null
  } catch (error) {
    console.error('Failed to fetch participant:', error)
    return null
  }
}

async function getParticipantAnalysis(id: string): Promise<AnalysisResult[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analysis-results?participantId=${id}`, {
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
    ? analysisResults.reduce((sum, result) => sum + result.reactionTime, 0) / analysisResults.length
    : 0

  const topEmotions = analysisResults.length > 0
    ? Object.entries(
        analysisResults.reduce((acc, result) => {
          Object.entries(result.emotionData).forEach(([emotion, value]) => {
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
                    "{result.stimulusWord}" → "{result.responseWord}"
                  </div>
                  <SpiritProbabilityBadge probability={result.spiritProbability} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(result.timestamp)}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">反応時間</div>
                  <div className="text-lg font-semibold">{result.reactionTime}ms</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Word2Vec</div>
                  <div className="text-lg font-semibold">{result.components.word2vec.toFixed(3)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">皮膚電位</div>
                  <div className="text-lg font-semibold">{result.components.skin_potential.toFixed(3)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">感情</div>
                  <div className="text-lg font-semibold">{result.components.emotion.toFixed(3)}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm text-muted-foreground mb-2">感情スコア</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(result.emotionData)
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

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ParticipantDetailPage({ params }: PageProps) {
  const { id } = await params
  const participant = await getParticipant(id)

  if (!participant) {
    notFound()
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
              {participant.name}
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

async function ParticipantDetailContent({ participant }: { participant: Participant }) {
  const analysisResults = await getParticipantAnalysis(participant.id)

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
