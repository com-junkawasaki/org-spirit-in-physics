'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface AnalysisReportData {
  emotionAnalysisSummary: {
    faceDataPoints: number
    prosodyDataPoints: number
    languageDataPoints: number
    totalEmotionPoints: number
    emotionSources: string[]
  }
  kawasakiModelResults: {
    totalAnalyses: number
    averageSpiritProbability: number
    maxSpiritProbability: number
    minSpiritProbability: number
    stdSpiritProbability: number
    highSpiritResponses: number
  }
  topPerformingWordPairs: Array<{
    stimulus: string
    response: string
    probability: number
    participant_name: string | null
  }>
  participantStats: Array<{
    participant_id: string
    name: string | null
    total_responses: number
    spirit_probabilities: number[]
  }>
  conclusion: {
    message: string
    totalParticipants: number
    totalResponses: number
  }
}

export function AnalysisReportClient() {
  const [reportData, setReportData] = useState<AnalysisReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch('/api/analysis-report', { cache: 'no-store' })
        if (!res.ok) {
          setReportData(null)
        } else {
          const json = await res.json()
          setReportData(json)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-muted-foreground">レポートデータを読み込めませんでした</h3>
        <p className="text-sm text-muted-foreground mt-2">分析レポートの生成に失敗しました。再度お試しください。</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>感情分析サマリー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{reportData.emotionAnalysisSummary.faceDataPoints}</div>
              <div className="text-sm text-muted-foreground">顔データポイント</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{reportData.emotionAnalysisSummary.prosodyDataPoints}</div>
              <div className="text-sm text-muted-foreground">韻律データポイント</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{reportData.emotionAnalysisSummary.languageDataPoints}</div>
              <div className="text-sm text-muted-foreground">言語データポイント</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{reportData.emotionAnalysisSummary.totalEmotionPoints}</div>
              <div className="text-sm text-muted-foreground">総感情ポイント</div>
            </div>
          </div>
          {reportData.emotionAnalysisSummary.emotionSources.length > 0 && (
            <div className="mt-4">
              <div className="text-sm text-muted-foreground mb-2">感情ソース:</div>
              <div className="flex flex-wrap gap-2">
                {reportData.emotionAnalysisSummary.emotionSources.map((source) => (
                  <Badge key={source} variant="outline">{source}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>川崎モデル結果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-muted-foreground">総分析数</div>
              <div className="text-2xl font-bold">{reportData.kawasakiModelResults.totalAnalyses}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">平均Spirit確率</div>
              <div className="text-2xl font-bold text-green-600">
                {(reportData.kawasakiModelResults.averageSpiritProbability * 100).toFixed(4)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">高Spirit応答 (&gt;0.8)</div>
              <div className="text-2xl font-bold text-blue-600">{reportData.kawasakiModelResults.highSpiritResponses}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>トップパフォーマンス単語ペア</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reportData.topPerformingWordPairs.map((pair, index) => (
              <div key={`${pair.stimulus}-${pair.response}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Badge variant="outline">{index + 1}</Badge>
                  <div>
                    <div className="font-medium">"{pair.stimulus}" → "{pair.response}"</div>
                    {pair.participant_name && (
                      <div className="text-sm text-muted-foreground">参加者: {pair.participant_name}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">{(pair.probability * 100).toFixed(4)}%</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">結論</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-700 mb-4">{reportData.conclusion.message}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">総参加者数</div>
              <div className="text-xl font-bold">{reportData.conclusion.totalParticipants}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">総応答数</div>
              <div className="text-xl font-bold">{reportData.conclusion.totalResponses}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


