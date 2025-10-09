'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  BarChart3,
  TrendingUp as TrendingUpIcon,
  Layers,
  FileText,
  Target
} from 'lucide-react'

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

function ResultsContent() {
  const params = useParams()
  const id = params.id as string
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnalysisResults() {
      const results = await getParticipantAnalysis(id)
      setAnalysisResults(results)
      setLoading(false)
    }

    if (id) {
      fetchAnalysisResults()
    }
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

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

      {analysisResults.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-muted-foreground">分析結果がありません</h3>
          <p className="text-sm text-muted-foreground mt-2">
            この参加者の分析結果はまだありません。
          </p>
        </div>
      )}
    </div>
  )
}

export default function ParticipantResultsPage() {
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
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          詳細結果
        </h1>
      </div>

      {/* Content */}
      <ResultsContent />
    </div>
  )
}
