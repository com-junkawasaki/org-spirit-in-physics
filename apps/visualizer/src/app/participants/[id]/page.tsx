import Link from 'next/link'
import { getParticipantData } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ParticipantData } from '@/lib/data'
import { ParticipantOverview } from '@/components/ParticipantOverview'
import {
  ArrowLeft,
  BarChart3,
  Users,
  Layers,
  FileText,
  TrendingUp as TrendingUpIcon,
  Target
} from 'lucide-react'

type Participant = ParticipantData


function getSpiritProbabilityColor(probability: number): string {
  if (probability >= 0.9999) return 'bg-green-100 text-green-800 border-green-200'
  if (probability >= 0.999) return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (probability >= 0.99) return 'bg-blue-100 text-blue-800 border-blue-200'
  if (probability >= 0.95) return 'bg-cyan-100 text-cyan-800 border-cyan-200'
  if (probability >= 0.90) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  if (probability >= 0.80) return 'bg-orange-100 text-orange-800 border-orange-200'
  return 'bg-red-100 text-red-800 border-red-200'
}

function SpiritProbabilityBadge({ probability }: { probability: number }) {
  return (
    <Badge className={`${getSpiritProbabilityColor(probability)} border`}>
      <Target className="h-3 w-3 mr-1" />
      {(probability * 100).toFixed(4)}%
    </Badge>
  )
}


function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
          </div>
          <div className="h-6 bg-muted rounded w-20 animate-pulse"></div>
        </div>

        {/* Metrics skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={`metric-card-${Date.now()}-${i}`} className="p-6 border rounded-lg">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
                <div className="ml-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                  <div className="h-8 bg-muted rounded w-16 animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sessions skeleton */}
        <div className="border rounded-lg">
          <div className="p-6 border-b">
            <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
          </div>
          <div className="p-6 space-y-4">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={`loading-session-${Date.now()}-${i}`} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="h-5 w-5 bg-muted rounded animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                    <div className="h-3 bg-muted rounded w-32 animate-pulse"></div>
                  </div>
                </div>
                <div className="h-6 bg-muted rounded w-16 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}




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
      <ParticipantOverview />
    </div>
  )
}


