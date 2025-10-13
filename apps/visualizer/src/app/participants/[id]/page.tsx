import Link from 'next/link'
import { getParticipantData } from '@/lib/data'
import { SpiritProbabilityBadge } from '@/components/SpiritProbabilityBadge'
import { Button } from '@/components/ui/button'
 
import { ParticipantOverview } from '@/components/ParticipantOverview'
import {
  ArrowLeft,
  BarChart3,
  Users,
  Layers,
  FileText,
  TrendingUp as TrendingUpIcon
} from 'lucide-react'

// type Participant = ParticipantData


// getSpiritProbabilityColor moved to shared component

// moved to shared component


// Loading skeleton not used in RSC flow




export default async function ParticipantDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  console.log('ParticipantDetailPage rendered with id:', id)

  const participant = await getParticipantData(id)

  if (!participant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">参加者が見つかりません</h3>
          <p className="text-sm text-muted-foreground mt-2">
            指定された参加者は存在しないか、削除された可能性があります。
          </p>
          <div className="mt-6">
            <Link href="/participants">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                被験者一覧に戻る
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex gap-4 mb-4">
          <Link href="/participants">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              被験者一覧に戻る
            </Button>
          </Link>
          <Link href={`/participants/${participant.id}/timeline`}>
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              時系列分析
            </Button>
          </Link>
          <Link href={`/participants/${participant.id}/correlation`}>
            <Button variant="outline">
              <TrendingUpIcon className="h-4 w-4 mr-2" />
              相関分析
            </Button>
          </Link>
          <Link href={`/participants/${participant.id}/vectors`}>
            <Button variant="outline">
              <Layers className="h-4 w-4 mr-2" />
              三次元ベクトル
            </Button>
          </Link>
          <Link href={`/participants/${participant.id}/results`}>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              詳細結果
            </Button>
          </Link>
          <Link href={`/participants/${participant.id}/report`}>
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              分析レポート
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {participant.name || `参加者 ${participant.id.slice(0, 8)}`}
            </h1>
            <p className="text-muted-foreground">
              被験者ID: {participant.id}
            </p>
          </div>
          <SpiritProbabilityBadge probability={participant.averageSpiritProbability} />
        </div>
      </div>

      {/* Content */}
      <ParticipantOverview participantId={id} />
    </div>
  )
}


