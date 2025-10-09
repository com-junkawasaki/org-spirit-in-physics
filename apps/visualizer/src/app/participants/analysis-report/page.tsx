'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Download, FileText } from 'lucide-react'

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

async function getAnalysisReport(): Promise<AnalysisReportData | null> {
  try {
    const response = await fetch('/api/analysis-report', {
      cache: 'no-store'
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  } catch (error) {
    console.error('Failed to fetch analysis report:', error)
    return null
  }
}

function LoadingSkeleton() {
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

export default function AnalysisReportPage() {
  const [reportData, setReportData] = useState<AnalysisReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReport() {
      const data = await getAnalysisReport()
      setReportData(data)
      setLoading(false)
    }

    fetchReport()
  }, [])

  const downloadReport = () => {
    if (!reportData) return

    const reportText = `# Hume AI + Kawasaki Model Analysis Report

## Emotion Analysis Summary
- **Face Data Points**: ${reportData.emotionAnalysisSummary.faceDataPoints}
- **Prosody Data Points**: ${reportData.emotionAnalysisSummary.prosodyDataPoints}
- **Language Data Points**: ${reportData.emotionAnalysisSummary.languageDataPoints}
- **Total Emotion Points**: ${reportData.emotionAnalysisSummary.totalEmotionPoints}
${reportData.emotionAnalysisSummary.emotionSources.length > 0
  ? `- **Emotion Sources**: ${reportData.emotionAnalysisSummary.emotionSources.join(', ')}`
  : ''}

## Kawasaki Model Results
- **Total Analyses**: ${reportData.kawasakiModelResults.totalAnalyses}
- **Average Spirit Probability**: ${(reportData.kawasakiModelResults.averageSpiritProbability * 100).toFixed(4)}%
- **Max Spirit Probability**: ${(reportData.kawasakiModelResults.maxSpiritProbability * 100).toFixed(4)}%
- **Min Spirit Probability**: ${(reportData.kawasakiModelResults.minSpiritProbability * 100).toFixed(4)}%
- **Std Spirit Probability**: ${reportData.kawasakiModelResults.stdSpiritProbability.toFixed(6)}
- **High Spirit Responses** (&gt;0.8): ${reportData.kawasakiModelResults.highSpiritResponses}

## Top Performing Word Pairs
${reportData.topPerformingWordPairs.map((pair) =>
  `- **${pair.stimulus}** → **${pair.response}** ${(pair.probability * 100).toFixed(4)}%${pair.participant_name ? ` (${pair.participant_name})` : ''}`
).join('\n')}

## Conclusion
${reportData.conclusion.message}

**Total Participants**: ${reportData.conclusion.totalParticipants}
**Total Responses**: ${reportData.conclusion.totalResponses}
`

    const blob = new Blob([reportText], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analysis_report_${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/participants">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              被験者一覧に戻る
            </Button>
          </Link>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/participants">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              被験者一覧に戻る
            </Button>
          </Link>
        </div>
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">レポートデータを読み込めませんでした</h3>
          <p className="text-sm text-muted-foreground mt-2">
            分析レポートの生成に失敗しました。再度お試しください。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/participants">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" />
                被験者一覧に戻る
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Hume AI + Kawasaki Model Analysis Report
              </h1>
              <p className="text-muted-foreground">
                感情分析と川崎モデルの統合分析結果レポート
              </p>
            </div>
          </div>
          <Button onClick={downloadReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            ダウンロード
          </Button>
        </div>
      </div>

      {/* Emotion Analysis Summary */}
      <Card className="mb-8">
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

      {/* Kawasaki Model Results */}
      <Card className="mb-8">
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
            <div>
              <div className="text-sm text-muted-foreground">最大Spirit確率</div>
              <div className="text-lg font-semibold">{(reportData.kawasakiModelResults.maxSpiritProbability * 100).toFixed(4)}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">最小Spirit確率</div>
              <div className="text-lg font-semibold">{(reportData.kawasakiModelResults.minSpiritProbability * 100).toFixed(4)}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">標準偏差</div>
              <div className="text-lg font-semibold">{reportData.kawasakiModelResults.stdSpiritProbability.toFixed(6)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Word Pairs */}
      <Card className="mb-8">
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
                    <div className="font-medium">
                      "{pair.stimulus}" → "{pair.response}"
                    </div>
                    {pair.participant_name && (
                      <div className="text-sm text-muted-foreground">
                        参加者: {pair.participant_name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    {(pair.probability * 100).toFixed(4)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conclusion */}
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
