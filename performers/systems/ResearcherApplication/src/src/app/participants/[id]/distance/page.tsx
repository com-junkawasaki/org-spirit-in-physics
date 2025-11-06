'use client'

// Merkle DAG: participants.word_distance -> word_distance_analysis_page
// 単語間距離マトリクス・ヒートマップ表示ページ

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft,
  BarChart3,
  RefreshCw,
  Grid,
  TrendingDown
} from 'lucide-react'

interface WordDistance {
  id: string
  word1: string
  word2: string
  distanceType: 'word2vec' | 'integrated' | 'emotional'
  distanceValue: number
  sessionId?: string
}

export default function WordDistancePage() {
  const params = useParams()
  const participantId = params.id as string
  
  const [distances, setDistances] = useState<WordDistance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDistanceType, setSelectedDistanceType] = useState<'word2vec' | 'integrated' | 'emotional'>('integrated')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDistanceData() {
      try {
        setIsLoading(true)
        setError(null)

        // TODO: GraphQL APIからデータ取得
        // 現時点ではモックデータを使用
        const mockDistances: WordDistance[] = [
          {
            id: '1',
            word1: '母',
            word2: '保護',
            distanceType: 'integrated',
            distanceValue: 0.23,
            sessionId: 'session-1',
          },
          {
            id: '2',
            word1: '母親',
            word2: '慈愛',
            distanceType: 'integrated',
            distanceValue: 0.18,
            sessionId: 'session-1',
          },
          {
            id: '3',
            word1: '影',
            word2: '闇',
            distanceType: 'integrated',
            distanceValue: 0.15,
            sessionId: 'session-1',
          },
        ]

        setDistances(mockDistances)
        setIsLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
        setIsLoading(false)
      }
    }

    if (participantId) {
      fetchDistanceData()
    }
  }, [participantId])

  const filteredDistances = distances.filter((d) => {
    if (selectedDistanceType && d.distanceType !== selectedDistanceType) {
      return false
    }
    if (selectedSessionId && d.sessionId !== selectedSessionId) {
      return false
    }
    return true
  })

  // 単語リストを取得（ユニーク）
  const uniqueWords = Array.from(
    new Set([
      ...filteredDistances.map((d) => d.word1),
      ...filteredDistances.map((d) => d.word2),
    ])
  ).sort()

  // 距離マトリクスを構築
  const distanceMatrix: Record<string, Record<string, number>> = {}
  uniqueWords.forEach((word1) => {
    distanceMatrix[word1] = {}
    uniqueWords.forEach((word2) => {
      const distance = filteredDistances.find(
        (d) =>
          (d.word1 === word1 && d.word2 === word2) ||
          (d.word1 === word2 && d.word2 === word1)
      )
      distanceMatrix[word1]![word2] = distance
        ? distance.distanceValue
        : word1 === word2
        ? 0
        : 1.0 // データがない場合は最大距離
    })
  })

  // 距離が近い単語ペアを抽出（距離が0.3以下）
  const closePairs = filteredDistances
    .filter((d) => d.distanceValue <= 0.3)
    .sort((a, b) => a.distanceValue - b.distanceValue)
    .slice(0, 20)

  // 統計情報
  const stats = {
    totalPairs: filteredDistances.length,
    averageDistance:
      filteredDistances.length > 0
        ? filteredDistances.reduce((sum, d) => sum + d.distanceValue, 0) /
          filteredDistances.length
        : 0,
    minDistance:
      filteredDistances.length > 0
        ? Math.min(...filteredDistances.map((d) => d.distanceValue))
        : 0,
    maxDistance:
      filteredDistances.length > 0
        ? Math.max(...filteredDistances.map((d) => d.distanceValue))
        : 0,
  }

  // 距離値を0-1に正規化して色を決定
  const getDistanceColor = (distance: number) => {
    // 距離が小さいほど赤（近い）、大きいほど青（遠い）
    const normalized = Math.min(distance / 1.0, 1.0)
    const hue = normalized * 240 // 赤(0)から青(240)へ
    return `hsl(${hue}, 70%, 50%)`
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">単語間距離データを読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <BarChart3 className="h-12 w-12 mx-auto mb-2" />
            <h2 className="text-xl font-bold">エラーが発生しました</h2>
          </div>
          <p className="text-muted-foreground mb-4">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link href={`/participants/${participantId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                詳細に戻る
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-8 w-8" />
                単語間距離分析
              </h1>
              <p className="text-muted-foreground">
                参加者ID: {participantId}
              </p>
            </div>
          </div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総ペア数</CardTitle>
              <Grid className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPairs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均距離</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.averageDistance.toFixed(3)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">最小距離</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.minDistance.toFixed(3)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">最大距離</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.maxDistance.toFixed(3)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* フィルター */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>フィルター</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={
                  selectedDistanceType === 'integrated' ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => setSelectedDistanceType('integrated')}
              >
                統合距離
              </Button>
              <Button
                variant={
                  selectedDistanceType === 'word2vec' ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => setSelectedDistanceType('word2vec')}
              >
                Word2Vec距離
              </Button>
              <Button
                variant={
                  selectedDistanceType === 'emotional' ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => setSelectedDistanceType('emotional')}
              >
                感情距離
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 距離が近い単語ペア */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>距離が近い単語ペア（上位20組）</CardTitle>
          <CardDescription>
            距離値が0.3以下の単語ペア
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {closePairs.map((pair) => (
              <div
                key={pair.id}
                className="flex items-center justify-between p-2 border rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{pair.word1}</span>
                  <span className="text-muted-foreground">↔</span>
                  <span className="font-medium">{pair.word2}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {pair.distanceValue.toFixed(3)}
                  </Badge>
                  <Badge variant="secondary">{pair.distanceType}</Badge>
                </div>
              </div>
            ))}
            {closePairs.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                距離が近い単語ペアがありません
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 距離マトリクス */}
      {uniqueWords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>距離マトリクス</CardTitle>
            <CardDescription>
              単語間の距離を可視化（赤=近い、青=遠い）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-2 bg-muted sticky left-0 z-10"></th>
                    {uniqueWords.map((word) => (
                      <th
                        key={word}
                        className="border p-2 bg-muted min-w-[100px] text-xs"
                      >
                        {word}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uniqueWords.map((word1) => (
                    <tr key={word1}>
                      <td className="border p-2 bg-muted sticky left-0 z-10 font-medium text-xs">
                        {word1}
                      </td>
                      {uniqueWords.map((word2) => {
                        const distance = distanceMatrix[word1]![word2] ?? 1.0
                        return (
                          <td
                            key={`${word1}-${word2}`}
                            className="border p-2 text-center text-xs"
                            style={{
                              backgroundColor: getDistanceColor(distance),
                              color: distance < 0.5 ? 'white' : 'black',
                            }}
                            title={`${word1} ↔ ${word2}: ${distance.toFixed(3)}`}
                          >
                            {distance.toFixed(2)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

