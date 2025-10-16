// Merkle DAG: experiment_stats -> experiment_statistics_component
// 実験統計コンポーネント - Reactコンポーネントとの連携

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Clock,
  Target,
  BarChart3
} from 'lucide-react'
import { ExperimentAnalysisData } from '@/lib/data'

interface ExperimentStatsProps {
  analysis: ExperimentAnalysisData
  isLoading?: boolean
}

export function ExperimentStats({ analysis, isLoading = false }: ExperimentStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-20" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-2" />
              <div className="h-3 bg-muted rounded w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const spiritDistribution = analysis.spiritProbabilityDistribution
  const totalResponses = spiritDistribution.high + spiritDistribution.medium + spiritDistribution.low
  const highPercentage = totalResponses > 0 ? (spiritDistribution.high / totalResponses) * 100 : 0
  const mediumPercentage = totalResponses > 0 ? (spiritDistribution.medium / totalResponses) * 100 : 0
  const lowPercentage = totalResponses > 0 ? (spiritDistribution.low / totalResponses) * 100 : 0

  const topEmotion = analysis.topEmotions[0]
  const topWordInsight = analysis.wordAssociationInsights[0]

  return (
    <div className="space-y-6">
      {/* 基本統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">参加者数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.totalParticipants}</div>
            <p className="text-xs text-muted-foreground">
              アクティブな参加者
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">セッション数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              完了したセッション
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総応答数</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.totalResponses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              収集された応答
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均Spirit確率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analysis.averageSpiritProbability * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              全体平均
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Spirit確率分布 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Spirit確率分布
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{spiritDistribution.high}</div>
              <div className="text-sm text-muted-foreground">高 (≥80%)</div>
              <Progress value={highPercentage} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{spiritDistribution.medium}</div>
              <div className="text-sm text-muted-foreground">中 (60-80%)</div>
              <Progress value={mediumPercentage} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{spiritDistribution.low}</div>
              <div className="text-sm text-muted-foreground">低 (<60%)</div>
              <Progress value={lowPercentage} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* トップ感情と単語連合 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">最も頻繁な感情</CardTitle>
          </CardHeader>
          <CardContent>
            {topEmotion ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{topEmotion.emotion}</span>
                  <Badge variant="secondary">
                    {(topEmotion.frequency * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  平均強度: {(topEmotion.averageIntensity * 100).toFixed(1)}%
                </div>
                <Progress value={topEmotion.frequency * 100} className="h-2" />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">データなし</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">最もSpirit相関の高い単語</CardTitle>
          </CardHeader>
          <CardContent>
            {topWordInsight ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">"{topWordInsight.word}"</span>
                  <Badge variant="secondary">
                    {(topWordInsight.spiritCorrelation * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  平均応答時間: {topWordInsight.averageResponseTime.toFixed(1)}秒
                </div>
                <Progress value={topWordInsight.spiritCorrelation * 100} className="h-2" />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">データなし</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 感情分布詳細 */}
      {analysis.topEmotions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">感情分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.topEmotions.slice(0, 5).map((emotion, index) => (
                <div key={emotion.emotion} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{emotion.emotion}</span>
                    <Badge variant="outline" className="text-xs">
                      {index + 1}位
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {(emotion.frequency * 100).toFixed(1)}%
                    </span>
                    <Progress value={emotion.frequency * 100} className="w-20 h-2" />
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
