import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@spiritinphysics/components/ui/card'
import { getAllParticipants } from '@/lib/data'

// Merkle DAG: spirit.integrated -> unified_spirit_analysis_page
// すべてのユーザーの実験データを情報空間に統合した spirit のビュー

interface SpiritStats {
  totalSpirits: number
  totalSessions: number
  averageSpiritProbability: number
  totalResponses: number
}

async function getIntegratedSpiritData(): Promise<SpiritStats> {
  const participants = (await getAllParticipants()) as any[]
  
  let totalSessions = 0
  let totalResponses = 0
  let totalSpiritProbability = 0
  let spiritsWithData = 0

  participants.forEach((participant) => {
    totalSessions += participant.sessionCount || 0
    totalResponses += participant.responseCount || 0
    if (participant.averageSpiritProbability > 0) {
      totalSpiritProbability += participant.averageSpiritProbability
      spiritsWithData++
    }
  })

  return {
    totalSpirits: participants.length,
    totalSessions,
    averageSpiritProbability: spiritsWithData > 0 ? totalSpiritProbability / spiritsWithData : 0,
    totalResponses
  }
}

export default async function SpiritPage() {
  const stats = await getIntegratedSpiritData()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">統合された Spirit</h1>
        <p className="text-muted-foreground">
          すべてのユーザーの実験データを情報空間に統合した spirit の統合分析ダッシュボード。
          開放系の情報空間として、個人を超えた集合的・社会的・環境的つながりを可視化します。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">総 Spirit 数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSpirits}</div>
            <p className="text-xs text-muted-foreground mt-1">統合された情報空間の数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">総セッション数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">全実験セッション</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">平均 Spirit 確率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.averageSpiritProbability * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">統合された spirit の平均確率</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">総応答数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalResponses}</div>
            <p className="text-xs text-muted-foreground mt-1">全単語応答データ</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spirit 統合情報空間</CardTitle>
          <CardDescription>
            開放系の情報空間として、すべての参加者のデータを統合した spirit の分析結果
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">概念定義</h3>
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Spirit</strong>: 社会や外部環境、他者に開かれた開放系の情報空間。
                個人を超えた集合的・社会的・環境的つながりを包含する開かれた情報空間です。
              </p>
              <p className="text-sm text-muted-foreground">
                このページでは、すべてのユーザーの実験データを情報空間に統合し、
                個人の境界を越えて拡張する情報空間としての spirit を分析・可視化します。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
