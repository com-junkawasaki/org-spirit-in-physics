'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Layers, Activity, Brain, Zap } from 'lucide-react'
import { SpiritProbabilityBadge } from '@/components/SpiritProbabilityBadge'
// import { ThreeVectorVisualization } from '@/components/ThreeVectorVisualization' // Three.js依存のため削除

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

// no date formatting needed here

// use shared badge

function VectorsContent() {
  const params = useParams()
  const id = params.id as string
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnalysisResults() {
      console.log('ベクターページ: データ取得開始', id)
      const results = await getParticipantAnalysis(id)
      console.log('ベクターページ: データ取得完了', results.length, '件')
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
    const validValues = values.filter(v => typeof v === 'number' && !Number.isNaN(v))
    return validValues.length > 0 ? Math.min(...validValues) : 0
  }

  const safeMax = (values: number[]) => {
    const validValues = values.filter(v => typeof v === 'number' && !Number.isNaN(v))
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
        <h3 className="text-lg font-medium">川崎モデル統合ベクトル視覚化</h3>
        <Badge variant="secondary">
          {analysisResults.length} 件のデータポイント
        </Badge>
      </div>

      {/* 3D Vector Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            川崎モデル統合3D視覚化
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-8 text-center bg-muted rounded-lg">
            <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">3D視覚化は一時的に無効化されています</h3>
            <p className="text-sm text-muted-foreground mt-2">
              TypeGPU版への移行により、3Dベクトル視覚化は一時的に無効化されています。
            </p>
          </div>

          {/* Vector Statistics（川崎モデル統合視覚化） */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Brain className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-sm text-muted-foreground">意味空間 (Word2Vec)</div>
              <div className="text-sm font-medium text-blue-700 mb-1">
                分布範囲: {(stats.word2vec.min || 0).toFixed(3)} - {(stats.word2vec.max || 0).toFixed(3)}
              </div>
              <div className="text-xs text-muted-foreground">
                単語の意味的類似性による配置
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Activity className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-sm text-muted-foreground">感情価 (統合)</div>
              <div className="text-sm font-medium text-green-700 mb-1">
                感情強度: {(stats.emotion.min || 0).toFixed(3)} - {(stats.emotion.max || 0).toFixed(3)}
              </div>
              <div className="text-xs text-muted-foreground">
                感情・生理反応の統合指標
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Zap className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="text-sm text-muted-foreground">活性度 (統合)</div>
              <div className="text-sm font-medium text-purple-700 mb-1">
                反応速度: {(stats.reactionTime.min || 0).toFixed(0)} - {(stats.reactionTime.max || 0).toFixed(0)}ms
              </div>
              <div className="text-xs text-muted-foreground">
                反応時間・生理反応の統合指標
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
              <h4 className="font-medium mb-2">川崎モデル統合視覚化の特徴</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>意味空間配置:</strong> Word2Vecにより単語の意味的関係性をX軸に配置</li>
                <li>• <strong>感情価統合:</strong> 感情・生理反応を統合したY軸による感情次元表現</li>
                <li>• <strong>活性度統合:</strong> 反応時間・生理反応を統合したZ軸による活性度表現</li>
                <li>• <strong>物理シミュレーション:</strong> 粒子間の自然な配置による直感的な理解</li>
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
          <Link href="/spirits">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              被験者一覧に戻る
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          川崎モデル統合ベクトル視覚化
        </h1>
      </div>

      {/* Content */}
      <VectorsContent />
    </div>
  )
}
