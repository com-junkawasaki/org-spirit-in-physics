'use client'

//! Session Detail Page
//! 
//! Merkle DAG: spirits.experiments.sessions.detail -> session_analysis_page
//! OWL: spirit:Session detail analysis view
//! 
//! セッション詳細分析ページ。選択されたセッションのWord2Vecデータを表示。

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Badge,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@spiritinphysics/components'
import { 
  Brain, 
  Activity, 
  Clock, 
  BarChart3, 
  RefreshCw, 
  Download,
  ArrowLeft,
  Eye,
  Target,
  Sparkles,
  Layers
} from 'lucide-react'
import { useSessionsByParticipant } from '@/lib/graphql/hooks'

// Merkle DAG: session.detail.word2vec_visualization
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

export default function SessionDetailPage() {
  const params = useParams()
  const participantId = params.id as string
  const experimentId = params.experimentId as string
  const sessionId = params.sessionId as string
  
  const { data: sessionData } = useSessionsByParticipant(participantId)
  const currentSession = sessionData?.sessionsByParticipant?.find(s => s.id === sessionId)
  
  const [wordData, setWordData] = useState<WordData[]>([])
  const [stats, setStats] = useState<ParticipantStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Merkle DAG: session.detail.fetch_word2vec_data
  // Word2Vecデータの取得（セッションIDでフィルタリング）
  const fetchWord2VecData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // セッションIDをクエリパラメータとして渡す
      const response = await fetch(`/api/spirits/${participantId}/word2vec?sessionId=${sessionId}`)
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
  }, [participantId, sessionId])

  useEffect(() => {
    if (sessionId) {
      fetchWord2VecData()
    }
  }, [fetchWord2VecData, sessionId])

  // Merkle DAG: session.detail.export_data
  // データエクスポート機能
  const exportData = () => {
    const exportData = {
      participantId,
      experimentId,
      sessionId,
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
    a.download = `session_${sessionId}_word2vec_data.json`
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
            <Link href={`/spirits/${participantId}/experiments/${experimentId}/sessions`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                セッション一覧に戻る
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                セッション詳細分析
              </h1>
              <p className="text-muted-foreground">
                セッション: {currentSession?.sessionType || sessionId.slice(0, 8)}...
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

        {/* セッション情報 */}
        {currentSession && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">セッションタイプ</p>
                  <p className="font-medium">{currentSession.sessionType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">開始時刻</p>
                  <p className="font-medium">
                    {new Date(currentSession.startTime).toLocaleString('ja-JP')}
                  </p>
                </div>
                {currentSession.endTime && (
                  <div>
                    <p className="text-sm text-muted-foreground">終了時刻</p>
                    <p className="font-medium">
                      {new Date(currentSession.endTime).toLocaleString('ja-JP')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="3d-visualization" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>3D可視化</span>
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>統計分析</span>
          </TabsTrigger>
          <TabsTrigger value="complex" className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4" />
            <span>Complex分析</span>
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

        {/* Complex分析タブ */}
        <TabsContent value="complex" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Complex分析 (complex = spirit)
              </CardTitle>
              <CardDescription>
                ユング心理学の複合体（Complex）分析とGhost Pattern（gene/meme/archetype）分類
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Complex = Spirit</strong>の前提に基づき、単語連想データから複合体パターンを分析します。
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href={`/spirits/${participantId}/complex`}>
                    <Card className="cursor-pointer hover:bg-muted transition-colors">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          Complex詳細
                        </CardTitle>
                        <CardDescription>
                          Complex値とGhost Patternの詳細表示
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                  <Link href={`/spirits/${participantId}/distance`}>
                    <Card className="cursor-pointer hover:bg-muted transition-colors">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          単語間距離分析
                        </CardTitle>
                        <CardDescription>
                          被験者・セッションごとの単語間距離マトリクス
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">分析内容</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Complex projection: spirit_probabilityをベクトル空間へ投影</li>
                    <li>Ghost Pattern分類: gene（遺伝的）/ meme（文化的）/ archetype（元型）</li>
                    <li>単語間距離: Word2Vec、統合ベクトル、感情ベクトルの距離計算</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
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

