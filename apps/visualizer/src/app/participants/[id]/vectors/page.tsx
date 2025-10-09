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
  Target,
  Activity,
  Clock,
  Brain,
  Zap
} from 'lucide-react'
import { ThreeVectorVisualization } from '@/components/ThreeVectorVisualization'

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

function VectorsContent() {
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
          <div className="h-96 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  // 3Dベクトルデータを準備
  const vectorData = analysisResults.map((result, index) => ({
    id: result.id,
    x: result.word2vec_component,
    y: result.reaction_time_component,
    z: result.skin_potential_component,
    emotion: result.emotion_component,
    stimulus: result.stimulus_word,
    response: result.response_word,
    probability: result.p_value,
    reactionTime: result.reaction_time_ms || 0,
    index: index
  }))

  // 安全な統計計算
  const safeMin = (values: number[]) => {
    const validValues = values.filter(v => typeof v === 'number' && !isNaN(v))
    return validValues.length > 0 ? Math.min(...validValues) : 0
  }

  const safeMax = (values: number[]) => {
    const validValues = values.filter(v => typeof v === 'number' && !isNaN(v))
    return validValues.length > 0 ? Math.max(...validValues) : 0
  }

  // 最大値・最小値を計算してスケーリング用の統計情報を準備
  const stats = {
    word2vec: {
      min: safeMin(vectorData.map(d => d.x)),
      max: safeMax(vectorData.map(d => d.x))
    },
    reactionTime: {
      min: safeMin(vectorData.map(d => d.y)),
      max: safeMax(vectorData.map(d => d.y))
    },
    skinPotential: {
      min: safeMin(vectorData.map(d => d.z)),
      max: safeMax(vectorData.map(d => d.z))
    },
    emotion: {
      min: safeMin(vectorData.map(d => d.emotion)),
      max: safeMax(vectorData.map(d => d.emotion))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">三次元ベクトル分析</h3>
        <Badge variant="secondary">
          {analysisResults.length} 件のデータポイント
        </Badge>
      </div>

      {/* 3D Vector Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            三次元散布図
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <ThreeVectorVisualization
              vectorData={vectorData}
              width={800}
              height={600}
            />
          </div>

          {/* Vector Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Brain className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-sm text-muted-foreground">Word2Vec</div>
              <div className="text-lg font-semibold">
                {(stats.word2vec.min || 0).toFixed(3)} - {(stats.word2vec.max || 0).toFixed(3)}
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Clock className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-sm text-muted-foreground">反応時間</div>
              <div className="text-lg font-semibold">
                {(stats.reactionTime.min || 0).toFixed(3)} - {(stats.reactionTime.max || 0).toFixed(3)}
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Zap className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="text-sm text-muted-foreground">皮膚電位</div>
              <div className="text-lg font-semibold">
                {(stats.skinPotential.min || 0).toFixed(3)} - {(stats.skinPotential.max || 0).toFixed(3)}
              </div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Activity className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <div className="text-sm text-muted-foreground">感情</div>
              <div className="text-lg font-semibold">
                {(stats.emotion.min || 0).toFixed(3)} - {(stats.emotion.max || 0).toFixed(3)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vector Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>ベクトルデータ詳細</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {vectorData.map((vector) => (
              <div key={vector.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div className="flex items-center space-x-4">
                  <Badge variant="outline">#{vector.index + 1}</Badge>
                  <div>
                    <div className="font-medium">
                      "{vector.stimulus}" → "{vector.response}"
                    </div>
                    <div className="text-sm text-muted-foreground">
                      反応時間: {vector.reactionTime}ms
                    </div>
                  </div>
                </div>
                  <div className="text-right">
                    <SpiritProbabilityBadge probability={vector.probability || 0} />
                    <div className="text-sm text-muted-foreground mt-1">
                      ({(vector.x || 0).toFixed(3)}, {(vector.y || 0).toFixed(3)}, {(vector.z || 0).toFixed(3)})
                    </div>
                  </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vector Analysis Insights */}
      <Card>
        <CardHeader>
          <CardTitle>ベクトル分析インサイト</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">データ分布の特徴</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Word2Vec成分の範囲: {(stats.word2vec.min || 0).toFixed(3)} - {(stats.word2vec.max || 0).toFixed(3)}</li>
                <li>• 反応時間成分の範囲: {(stats.reactionTime.min || 0).toFixed(3)} - {(stats.reactionTime.max || 0).toFixed(3)}</li>
                <li>• 皮膚電位成分の範囲: {(stats.skinPotential.min || 0).toFixed(3)} - {(stats.skinPotential.max || 0).toFixed(3)}</li>
                <li>• 感情成分の範囲: {(stats.emotion.min || 0).toFixed(3)} - {(stats.emotion.max || 0).toFixed(3)}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">高Spirit確率のデータポイント</h4>
              <div className="space-y-2">
                {vectorData
                  .filter(v => (v.probability || 0) > 0.9)
                  .slice(0, 3)
                  .map((vector) => (
                    <div key={vector.id} className="flex items-center justify-between text-sm">
                      <span>#{vector.index + 1}: "{vector.stimulus}" → "{vector.response}"</span>
                      <SpiritProbabilityBadge probability={vector.probability || 0} />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {analysisResults.length === 0 && (
        <div className="text-center py-12">
          <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">ベクトルデータがありません</h3>
          <p className="text-sm text-muted-foreground mt-2">
            この参加者の分析結果からベクトルデータを生成できませんでした。
          </p>
        </div>
      )}
    </div>
  )
}

export default function ParticipantVectorsPage() {
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
          三次元ベクトル分析
        </h1>
      </div>

      {/* Content */}
      <VectorsContent />
    </div>
  )
}
