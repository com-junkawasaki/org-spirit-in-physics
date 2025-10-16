'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Play,
  Download,
  Eye
} from 'lucide-react'

// Merkle DAG: analysis.session_comparison -> session_comparison_page
// セッション比較分析ページ
// 依存関係: api/analysis/session-comparison

interface SessionComparisonResult {
  analysisId: string
  session1Id: string
  session2Id: string
  totalCommonWords: number
  averageReactionTimeDifference: number
  averageSpiritProbabilityDifference: number
  improvementRate: number
  reactionTimeImprovement: number
  reactionTimeDegradation: number
  spiritProbabilityImprovement: number
  spiritProbabilityDegradation: number
  createdAt: string
}

interface WordDifference {
  word: string
  session1ReactionTime: number
  session2ReactionTime: number
  reactionTimeDifference: number
  session1SpiritProbability: number
  session2SpiritProbability: number
  spiritProbabilityDifference: number
}

export default function SessionComparisonPage() {
  const [participantId, setParticipantId] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<SessionComparisonResult[]>([])
  const [wordDifferences, setWordDifferences] = useState<WordDifference[]>([])
  const [error, setError] = useState<string | null>(null)
  const [lastAnalysis, setLastAnalysis] = useState<any>(null)

  // Merkle DAG: analysis.session_comparison.fetch_results
  // 既存の分析結果取得
  const fetchResults = async () => {
    if (!participantId.trim()) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/analysis/session-comparison?participantId=${participantId}`)
      const data = await response.json()

      if (data.success) {
        setResults(data.analyses)
      } else {
        setError(data.error || '分析結果の取得に失敗しました')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  // Merkle DAG: analysis.session_comparison.run_analysis
  // セッション比較分析実行
  const runAnalysis = async () => {
    if (!participantId.trim()) {
      setError('参加者IDを入力してください')
      return
    }

    try {
      setIsAnalyzing(true)
      setError(null)

      const response = await fetch('/api/analysis/session-comparison', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ participantId })
      })

      const data = await response.json()

      if (data.success) {
        setLastAnalysis(data)
        setWordDifferences(data.differences || [])
        await fetchResults() // 結果を再取得
      } else {
        setError(data.error || '分析の実行に失敗しました')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Merkle DAG: analysis.session_comparison.export_data
  // データエクスポート
  const exportData = () => {
    if (!lastAnalysis) return

    const exportData = {
      participantId,
      analysisId: lastAnalysis.analysisId,
      exportDate: new Date().toISOString(),
      statistics: lastAnalysis.statistics,
      wordDifferences: wordDifferences
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `session_comparison_${participantId}_${lastAnalysis.analysisId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (participantId) {
      fetchResults()
    }
  }, [participantId])

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          セッション比較分析
        </h1>
        <p className="text-muted-foreground">
          セッション1回目と2回目の反応時間・Spirit確率の差異を分析します
        </p>
      </div>

      {/* 入力フォーム */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>分析設定</CardTitle>
          <CardDescription>
            参加者IDを入力してセッション比較分析を実行してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="participantId">参加者ID</Label>
              <Input
                id="participantId"
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                placeholder="例: 2a0d7a69-f953-4c29-87a5-8a8e4e8bd413"
                className="mt-1"
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={runAnalysis} 
                disabled={isAnalyzing || !participantId.trim()}
                className="flex items-center space-x-2"
              >
                {isAnalyzing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                <span>{isAnalyzing ? '分析中...' : '分析実行'}</span>
              </Button>
              <Button 
                onClick={fetchResults} 
                disabled={isLoading || !participantId.trim()}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>結果更新</span>
              </Button>
              {lastAnalysis && (
                <Button 
                  onClick={exportData} 
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>エクスポート</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-600">
              <strong>エラー:</strong> {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 最新の分析結果 */}
      {lastAnalysis && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">最新の分析結果</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">共通単語数</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lastAnalysis.statistics.totalCommonWords}</div>
                <p className="text-xs text-muted-foreground">
                  両セッションで共通
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">改善率</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {lastAnalysis.statistics.comparisonStats.improvementRate.toFixed(1)}%
                </div>
                <Badge className={
                  lastAnalysis.statistics.comparisonStats.improvementRate > 0 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }>
                  {lastAnalysis.statistics.comparisonStats.improvementRate > 0 ? '改善' : '悪化'}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">セッション1平均</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {lastAnalysis.statistics.session1Stats.averageReactionTime.toFixed(0)}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  標準偏差: {lastAnalysis.statistics.session1Stats.standardDeviation.toFixed(0)}ms
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">セッション2平均</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {lastAnalysis.statistics.session2Stats.averageReactionTime.toFixed(0)}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  標準偏差: {lastAnalysis.statistics.session2Stats.standardDeviation.toFixed(0)}ms
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 詳細統計情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">反応時間改善</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {lastAnalysis.statistics.comparisonStats.reactionTimeImprovement}
                </div>
                <p className="text-xs text-muted-foreground">
                  単語数
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">反応時間悪化</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {lastAnalysis.statistics.comparisonStats.reactionTimeDegradation}
                </div>
                <p className="text-xs text-muted-foreground">
                  単語数
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Spirit確率改善</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {lastAnalysis.statistics.comparisonStats.spiritProbabilityImprovement}
                </div>
                <p className="text-xs text-muted-foreground">
                  単語数
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Spirit確率悪化</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {lastAnalysis.statistics.comparisonStats.spiritProbabilityDegradation}
                </div>
                <p className="text-xs text-muted-foreground">
                  単語数
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 単語別差異 */}
      {wordDifferences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>単語別差異詳細</CardTitle>
            <CardDescription>
              共通単語の反応時間・Spirit確率の差異（上位20件）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">単語</th>
                    <th className="text-right p-2">セッション1</th>
                    <th className="text-right p-2">セッション2</th>
                    <th className="text-right p-2">差異</th>
                    <th className="text-right p-2">Spirit確率1</th>
                    <th className="text-right p-2">Spirit確率2</th>
                    <th className="text-right p-2">Spirit差異</th>
                  </tr>
                </thead>
                <tbody>
                  {wordDifferences.map((diff, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2 font-medium">{diff.word}</td>
                      <td className="p-2 text-right">{diff.session1ReactionTime}ms</td>
                      <td className="p-2 text-right">{diff.session2ReactionTime}ms</td>
                      <td className="p-2 text-right">
                        <span className={
                          diff.reactionTimeDifference < 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }>
                          {diff.reactionTimeDifference > 0 ? '+' : ''}{diff.reactionTimeDifference}ms
                        </span>
                      </td>
                      <td className="p-2 text-right">{(diff.session1SpiritProbability * 100).toFixed(1)}%</td>
                      <td className="p-2 text-right">{(diff.session2SpiritProbability * 100).toFixed(1)}%</td>
                      <td className="p-2 text-right">
                        <span className={
                          diff.spiritProbabilityDifference > 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }>
                          {diff.spiritProbabilityDifference > 0 ? '+' : ''}{(diff.spiritProbabilityDifference * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 過去の分析結果 */}
      {results.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>過去の分析結果</CardTitle>
            <CardDescription>
              この参加者の過去のセッション比較分析結果
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result) => (
                <div key={result.analysisId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">分析ID: {result.analysisId}</div>
                    <div className="text-sm text-muted-foreground">
                      共通単語: {result.totalCommonWords} | 
                      改善率: {result.improvementRate.toFixed(1)}% | 
                      改善: {result.reactionTimeImprovement} | 悪化: {result.reactionTimeDegradation}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(result.createdAt).toLocaleString('ja-JP')}
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
