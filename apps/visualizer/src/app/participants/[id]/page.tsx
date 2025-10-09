'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Calendar,
  Clock,
  TrendingUp,
  Activity,
  BarChart3,
  Users,
  Target,
  Layers,
  FileText,
  TrendingUp as TrendingUpIcon
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
  physiological_data: Record<string, unknown> | null
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
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">概要</TabsTrigger>
        <TabsTrigger value="results">詳細結果</TabsTrigger>
        <TabsTrigger value="report">分析レポート</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab participant={participant} analysisResults={analysisResults} />
      </TabsContent>

      <TabsContent value="results">
        <ResultsTab analysisResults={analysisResults} />
      </TabsContent>

      <TabsContent value="report">
        <AnalysisReportTab />
      </TabsContent>
    </Tabs>
  )
}
