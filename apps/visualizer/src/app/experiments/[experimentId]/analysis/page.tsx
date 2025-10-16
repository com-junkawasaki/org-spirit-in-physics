// Merkle DAG: experiment_analysis_page -> analysis_results_display
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BarChart3, TrendingUp, Users, Activity, Brain } from 'lucide-react'

interface AnalysisResult {
  experimentId: string
  totalParticipants: number
  totalSessions: number
  totalResponses: number
  averageSpiritProbability: number
  spiritProbabilityDistribution: {
    high: number
    medium: number
    low: number
  }
  topEmotions: Array<{
    emotion: string
    frequency: number
    averageIntensity: number
  }>
  wordAssociationInsights: Array<{
    word: string
    averageResponseTime: number
    spiritCorrelation: number
  }>
}

// Placeholder data - will be replaced with Neo4j query
async function getExperimentAnalysis(experimentId: string): Promise<AnalysisResult | null> {
  // TODO: Implement Neo4j query for experiment analysis
  return {
    experimentId,
    totalParticipants: 12,
    totalSessions: 24,
    totalResponses: 2400,
    averageSpiritProbability: 0.724,
    spiritProbabilityDistribution: {
      high: 8,
      medium: 3,
      low: 1
    },
    topEmotions: [
      { emotion: '喜び', frequency: 0.35, averageIntensity: 0.72 },
      { emotion: '驚き', frequency: 0.28, averageIntensity: 0.68 },
      { emotion: '恐れ', frequency: 0.22, averageIntensity: 0.45 },
      { emotion: '悲しみ', frequency: 0.15, averageIntensity: 0.38 }
    ],
    wordAssociationInsights: [
      { word: '愛', averageResponseTime: 1.2, spiritCorrelation: 0.89 },
      { word: '神', averageResponseTime: 2.1, spiritCorrelation: 0.92 },
      { word: '死', averageResponseTime: 3.4, spiritCorrelation: 0.45 },
      { word: '生', averageResponseTime: 1.8, spiritCorrelation: 0.78 }
    ]
  }
}

function AnalysisOverview({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{analysis.totalParticipants}</div>
                <div className="text-sm text-muted-foreground">参加者</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{analysis.totalSessions}</div>
                <div className="text-sm text-muted-foreground">セッション</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{analysis.totalResponses}</div>
                <div className="text-sm text-muted-foreground">応答数</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">
                  {(analysis.averageSpiritProbability * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">平均Spirit確率</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spirit Probability Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Spirit確率分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {analysis.spiritProbabilityDistribution.high}
              </div>
              <div className="text-sm text-green-600">高確率 (80%以上)</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {analysis.spiritProbabilityDistribution.medium}
              </div>
              <div className="text-sm text-yellow-600">中確率 (60-80%)</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {analysis.spiritProbabilityDistribution.low}
              </div>
              <div className="text-sm text-red-600">低確率 (60%未満)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Emotions */}
      <Card>
        <CardHeader>
          <CardTitle>主要感情</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.topEmotions.map((emotion, index) => (
              <div key={emotion.emotion} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">{index + 1}</Badge>
                  <span className="font-medium">{emotion.emotion}</span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>頻度: {(emotion.frequency * 100).toFixed(1)}%</span>
                  <span>強度: {(emotion.averageIntensity * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Word Association Insights */}
      <Card>
        <CardHeader>
          <CardTitle>単語連合インサイト</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.wordAssociationInsights.map((insight, index) => (
              <div key={insight.word} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">{index + 1}</Badge>
                  <span className="font-medium">{insight.word}</span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>応答時間: {insight.averageResponseTime}s</span>
                  <span>Spirit相関: {(insight.spiritCorrelation * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="h-8 bg-muted rounded w-16"></div>
                <div className="h-4 bg-muted rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-32"></div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

async function AnalysisWrapper({ experimentId }: { experimentId: string }) {
  const analysis = await getExperimentAnalysis(experimentId)
  if (!analysis) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">分析結果が見つかりません</h3>
        <p className="text-sm text-muted-foreground mt-2">
          この実験の分析結果が存在しないか、データが不足しています。
        </p>
      </div>
    )
  }
  return <AnalysisOverview analysis={analysis} />
}

export default async function ExperimentAnalysisPage({ 
  params 
}: { 
  params: { experimentId: string } 
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            分析結果
          </h2>
          <p className="text-muted-foreground">
            実験 {params.experimentId} の詳細分析結果
          </p>
        </div>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <AnalysisWrapper experimentId={params.experimentId} />
      </Suspense>
    </div>
  )
}
