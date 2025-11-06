'use client'

// Merkle DAG: participants.complex_detail -> complex_analysis_page
// Complex詳細・Ghost Pattern表示ページ

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft,
  Sparkles,
  Layers,
  Brain,
  RefreshCw,
  Target,
  TrendingUp
} from 'lucide-react'

interface Complex {
  id: string
  participantId: string
  sessionId?: string
  complexValue: number
  wordPairs?: Array<{ word1: string; word2: string; distance: number }>
}

interface GhostPattern {
  id: string
  patternType: 'gene' | 'meme' | 'archetype'
  patternName: string
  confidence: number
  wordAssociations?: string[]
}

export default function ComplexDetailPage() {
  const params = useParams()
  const participantId = params.id as string
  
  const [complexes, setComplexes] = useState<Complex[]>([])
  const [ghostPatterns, setGhostPatterns] = useState<GhostPattern[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPatternType, setSelectedPatternType] = useState<string | null>(null)

  useEffect(() => {
    async function fetchComplexData() {
      try {
        setIsLoading(true)
        setError(null)

        // TODO: GraphQL APIからデータ取得
        // 現時点ではモックデータを使用
        setComplexes([
          {
            id: '1',
            participantId,
            complexValue: 0.85,
            wordPairs: [
              { word1: '母', word2: '保護', distance: 0.2 },
              { word1: '母親', word2: '慈愛', distance: 0.15 },
            ],
          },
        ])

        setGhostPatterns([
          {
            id: '1',
            patternType: 'archetype',
            patternName: 'Mother',
            confidence: 0.78,
            wordAssociations: ['母', '母親', '保護', '慈愛'],
          },
          {
            id: '2',
            patternType: 'archetype',
            patternName: 'Shadow',
            confidence: 0.65,
            wordAssociations: ['影', '闇'],
          },
        ])

        setIsLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
        setIsLoading(false)
      }
    }

    if (participantId) {
      fetchComplexData()
    }
  }, [participantId])

  const filteredPatterns = selectedPatternType
    ? ghostPatterns.filter((p) => p.patternType === selectedPatternType)
    : ghostPatterns

  const patternTypeStats = {
    archetype: ghostPatterns.filter((p) => p.patternType === 'archetype').length,
    gene: ghostPatterns.filter((p) => p.patternType === 'gene').length,
    meme: ghostPatterns.filter((p) => p.patternType === 'meme').length,
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Complexデータを読み込み中...</p>
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
        </div>
      </div>
    )
  }

  const avgComplexValue =
    complexes.length > 0
      ? complexes.reduce((sum, c) => sum + c.complexValue, 0) / complexes.length
      : 0

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
                <Sparkles className="h-8 w-8" />
                Complex詳細分析
              </h1>
              <p className="text-muted-foreground">
                参加者ID: {participantId} | complex = spirit
              </p>
            </div>
          </div>
        </div>

        {/* Complex統計 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均Complex値</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(avgComplexValue * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {complexes.length}件のComplexデータ
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ghost Pattern数</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ghostPatterns.length}</div>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">archetype: {patternTypeStats.archetype}</Badge>
                <Badge variant="outline">gene: {patternTypeStats.gene}</Badge>
                <Badge variant="outline">meme: {patternTypeStats.meme}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">最高信頼度</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {ghostPatterns.length > 0
                  ? (Math.max(...ghostPatterns.map((p) => p.confidence)) * 100).toFixed(1)
                  : '0'}%
              </div>
              <p className="text-xs text-muted-foreground">
                {ghostPatterns.length > 0
                  ? ghostPatterns.find(
                      (p) =>
                        p.confidence ===
                        Math.max(...ghostPatterns.map((p) => p.confidence))
                    )?.patternName
                  : '-'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* メインコンテンツ */}
      <Tabs defaultValue="complexes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="complexes" className="flex items-center space-x-2">
            <Layers className="h-4 w-4" />
            <span>Complex一覧</span>
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4" />
            <span>Ghost Patterns</span>
          </TabsTrigger>
        </TabsList>

        {/* Complex一覧 */}
        <TabsContent value="complexes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complex一覧</CardTitle>
              <CardDescription>
                Complex = Spiritとして扱う複合体データ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complexes.map((complex) => (
                  <Card key={complex.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          Complex #{complex.id}
                        </CardTitle>
                        <Badge
                          className={
                            complex.complexValue > 0.7
                              ? 'bg-green-100 text-green-800'
                              : complex.complexValue > 0.4
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {(complex.complexValue * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      {complex.sessionId && (
                        <CardDescription>
                          セッション: {complex.sessionId}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {complex.wordPairs && complex.wordPairs.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">関連単語ペア</h4>
                          <div className="space-y-1">
                            {complex.wordPairs.map((pair, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-sm"
                              >
                                <span>
                                  {pair.word1} ↔ {pair.word2}
                                </span>
                                <Badge variant="outline">
                                  距離: {pair.distance.toFixed(3)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {complexes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Complexデータがありません
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ghost Patterns */}
        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ghost Pattern分類</CardTitle>
              <CardDescription>
                gene（遺伝的）/ meme（文化的）/ archetype（元型）パターン
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-2">
                <Button
                  variant={selectedPatternType === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPatternType(null)}
                >
                  全て
                </Button>
                <Button
                  variant={
                    selectedPatternType === 'archetype' ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() => setSelectedPatternType('archetype')}
                >
                  Archetype
                </Button>
                <Button
                  variant={selectedPatternType === 'gene' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPatternType('gene')}
                >
                  Gene
                </Button>
                <Button
                  variant={selectedPatternType === 'meme' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPatternType('meme')}
                >
                  Meme
                </Button>
              </div>

              <div className="space-y-3">
                {filteredPatterns
                  .sort((a, b) => b.confidence - a.confidence)
                  .map((pattern) => (
                    <Card key={pattern.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            {pattern.patternName}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                pattern.patternType === 'archetype'
                                  ? 'default'
                                  : pattern.patternType === 'gene'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {pattern.patternType}
                            </Badge>
                            <Badge>
                              {(pattern.confidence * 100).toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {pattern.wordAssociations &&
                          pattern.wordAssociations.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">関連単語</h4>
                              <div className="flex flex-wrap gap-2">
                                {pattern.wordAssociations.map((word, idx) => (
                                  <Badge key={idx} variant="outline">
                                    {word}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  ))}
                {filteredPatterns.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Ghost Patternが検出されませんでした
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

