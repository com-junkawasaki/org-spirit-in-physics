'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'

// 3D可視化コンポーネントを一時的に無効化
// const Word2Vec3DVisualization = dynamic(() => import('@/components/Word2Vec3DVisualization').then(mod => ({ default: mod.Word2Vec3DVisualization })), {
//   ssr: false,
//   loading: () => <div className="flex items-center justify-center h-[600px]">3D可視化を読み込み中...</div>
// })

// シンプルな2D可視化コンポーネント
const Word2VecVisualization = ({ wordData }: { wordData: any[] }) => {
  return (
    <div className="h-[600px] overflow-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {wordData.map((data, index) => (
          <div key={data.responseId} className="bg-white rounded-lg shadow-md p-4 border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">{data.word}</h3>
              <div 
                className="w-4 h-4 rounded-full"
                style={{
                  backgroundColor: `hsl(${(1 - data.spiritProbability) * 240}, 70%, 50%)`
                }}
              />
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <div>Spirit確率: {(data.spiritProbability * 100).toFixed(1)}%</div>
              <div>反応時間: {data.reactionTime}ms</div>
              <div>時刻: {new Date(data.timestamp).toLocaleString('ja-JP')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Brain, 
  Activity, 
  Clock, 
  BarChart3, 
  RefreshCw, 
  Download,
  ArrowLeft,
  Eye,
  Target
} from 'lucide-react'
import Link from 'next/link'

// Merkle DAG: participants.detail -> participant_analysis_page
// 参加者詳細分析ページ
// 依存関係: Word2Vec3DVisualization, api/participants/[id]/word2vec

interface WordData {
  word: string
  embedding: number[]
  spiritProbability: number
  reactionTime: number
  timestamp: string
  participantId: string
  responseId: string
}

interface ParticipantStats {
  totalWords: number
  uniqueWords: number
  averageSpiritProbability: number
  averageReactionTime: number
}

export default function ParticipantDetailPage() {
  const params = useParams()
  const participantId = params.id as string
  
  const [wordData, setWordData] = useState<WordData[]>([])
  const [stats, setStats] = useState<ParticipantStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Merkle DAG: participants.detail.fetch_data
  // Word2Vecデータの取得
  const fetchWord2VecData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/participants/${participantId}/word2vec`)
      const data = await response.json()
      
      if (data.success) {
        setWordData(data.wordData)
        setStats(data.statistics)
        setLastUpdated(new Date())
      } else {
        setError(data.error || 'データの取得に失敗しました')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [participantId])

  useEffect(() => {
    fetchWord2VecData()
  }, [fetchWord2VecData])

  // Merkle DAG: participants.detail.export_data
  // データエクスポート機能
  const exportData = () => {
    const exportData = {
      participantId,
      exportDate: new Date().toISOString(),
      statistics: stats,
      wordData: wordData.map(d => ({
        word: d.word,
        spiritProbability: d.spiritProbability,
        reactionTime: d.reactionTime,
        timestamp: d.timestamp
      }))
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `participant_${participantId}_word2vec_data.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Word2Vecデータを読み込み中...</p>
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
            <Target className="h-12 w-12 mx-auto mb-2" />
            <h2 className="text-xl font-bold">エラーが発生しました</h2>
          </div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchWord2VecData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            再試行
          </Button>
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
            <Link href="/participants">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                一覧に戻る
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                参加者詳細分析
              </h1>
              <p className="text-muted-foreground">
                参加者ID: {participantId}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={fetchWord2VecData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              更新
            </Button>
            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              エクスポート
            </Button>
          </div>
        </div>

        {/* 統計カード */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総単語数</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalWords}</div>
                <p className="text-xs text-muted-foreground">
                  ユニーク: {stats.uniqueWords}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均Spirit確率</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(stats.averageSpiritProbability * 100).toFixed(1)}%
                </div>
                <Badge className={stats.averageSpiritProbability > 0.7 ? 'bg-green-100 text-green-800' : 
                                 stats.averageSpiritProbability > 0.4 ? 'bg-yellow-100 text-yellow-800' : 
                                 'bg-red-100 text-red-800'}>
                  {stats.averageSpiritProbability > 0.7 ? '高' : 
                   stats.averageSpiritProbability > 0.4 ? '中' : '低'}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均反応時間</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageReactionTime.toFixed(0)}ms</div>
                <p className="text-xs text-muted-foreground">
                  {stats.averageReactionTime < 1000 ? '高速' : 
                   stats.averageReactionTime < 2000 ? '標準' : '低速'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">最終更新</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold">
                  {lastUpdated.toLocaleTimeString('ja-JP')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {lastUpdated.toLocaleDateString('ja-JP')}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* メインコンテンツ */}
      <Tabs defaultValue="3d-visualization" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="3d-visualization" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>3D可視化</span>
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>統計分析</span>
          </TabsTrigger>
          <TabsTrigger value="raw-data" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>生データ</span>
          </TabsTrigger>
        </TabsList>

        {/* 3D可視化タブ */}
        <TabsContent value="3d-visualization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Word2Vec 3D可視化</CardTitle>
              <CardDescription>
                Word2Vec埋め込みベクトルを3D空間で可視化。色はSpirit確率、サイズは反応時間を表します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] w-full">
                <Word2VecVisualization 
                  wordData={wordData}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 統計分析タブ */}
        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Spirit確率分布</CardTitle>
                <CardDescription>単語別Spirit確率の分布</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {wordData
                    .sort((a, b) => b.spiritProbability - a.spiritProbability)
                    .slice(0, 10)
                    .map((data) => (
                      <div key={data.responseId} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{data.word}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${data.spiritProbability * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-muted-foreground w-12">
                            {(data.spiritProbability * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>反応時間分布</CardTitle>
                <CardDescription>単語別反応時間の分布</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {wordData
                    .sort((a, b) => a.reactionTime - b.reactionTime)
                    .slice(0, 10)
                    .map((data) => (
                      <div key={data.responseId} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{data.word}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(data.reactionTime / 3000, 1) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-muted-foreground w-12">
                            {data.reactionTime}ms
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 生データタブ */}
        <TabsContent value="raw-data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Word2Vec生データ</CardTitle>
              <CardDescription>取得されたWord2Vec埋め込みデータの詳細</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-auto">
                <pre className="text-xs bg-gray-50 p-4 rounded">
                  {JSON.stringify(wordData, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}