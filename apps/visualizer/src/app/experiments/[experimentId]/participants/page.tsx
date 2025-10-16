// Merkle DAG: experiment_participants_page -> participant_list_display
import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Activity, Brain, BarChart3, ArrowRight } from 'lucide-react'

interface Participant {
  id: string
  name: string
  sessionCount: number
  responseCount: number
  averageSpiritProbability: number
  lastActivity: number | null
}

// Placeholder data - will be replaced with Neo4j query
async function getExperimentParticipants(experimentId: string): Promise<Participant[]> {
  // TODO: Implement Neo4j query for experiment participants
  return [
    {
      id: 'participant-001',
      name: 'Participant A',
      sessionCount: 2,
      responseCount: 195,
      averageSpiritProbability: 0.724,
      lastActivity: Date.now() - 86400000 // 1 day ago
    },
    {
      id: 'participant-002',
      name: 'Participant B',
      sessionCount: 1,
      responseCount: 95,
      averageSpiritProbability: 0.689,
      lastActivity: Date.now() - 172800000 // 2 days ago
    }
  ]
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getSpiritProbabilityColor(probability: number): string {
  if (probability >= 0.8) return 'bg-green-500'
  if (probability >= 0.6) return 'bg-yellow-500'
  if (probability >= 0.4) return 'bg-orange-500'
  return 'bg-red-500'
}

function ParticipantsTable({ participants }: { participants: Participant[] }) {
  if (participants.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">参加者が見つかりません</h3>
        <p className="text-sm text-muted-foreground mt-2">
          この実験にはまだ参加者が登録されていません。
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>参加者</TableHead>
            <TableHead>セッション数</TableHead>
            <TableHead>応答数</TableHead>
            <TableHead>平均Spirit確率</TableHead>
            <TableHead>最終活動</TableHead>
            <TableHead className="w-[100px]">アクション</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.map((participant) => (
            <TableRow key={participant.id}>
              <TableCell>
                <div>
                  <div className="font-medium">
                    {participant.name || `参加者 ${participant.id.slice(0, 8)}`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {participant.id.slice(0, 12)}...
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span>{participant.sessionCount}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4 text-muted-foreground" />
                  <span>{participant.responseCount}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getSpiritProbabilityColor(participant.averageSpiritProbability)}>
                  {(participant.averageSpiritProbability * 100).toFixed(1)}%
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(participant.lastActivity)}
              </TableCell>
              <TableCell>
                <Link href={`/participants/${participant.id}`}>
                  <Button variant="outline" size="sm">
                    詳細
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function LoadingSkeleton() {
  const skeletonKeys = ['sk-1', 'sk-2', 'sk-3']
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>参加者</TableHead>
            <TableHead>セッション数</TableHead>
            <TableHead>応答数</TableHead>
            <TableHead>平均Spirit確率</TableHead>
            <TableHead>最終活動</TableHead>
            <TableHead className="w-[100px]">アクション</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {skeletonKeys.map((key) => (
            <TableRow key={key} className="animate-pulse">
              <TableCell>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-3 bg-muted rounded w-16"></div>
                </div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded w-8"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded w-8"></div>
              </TableCell>
              <TableCell>
                <div className="h-6 bg-muted rounded w-12"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded w-20"></div>
              </TableCell>
              <TableCell>
                <div className="h-8 bg-muted rounded w-16"></div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

async function ParticipantsTableWrapper({ experimentId }: { experimentId: string }) {
  const participants = await getExperimentParticipants(experimentId)
  if (!participants || participants.length === 0) {
    return <LoadingSkeleton />
  }
  return <ParticipantsTable participants={participants} />
}

export default async function ExperimentParticipantsPage({ 
  params 
}: { 
  params: { experimentId: string } 
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            参加者一覧
          </h2>
          <p className="text-muted-foreground">
            実験 {params.experimentId} の参加者一覧
          </p>
        </div>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <ParticipantsTableWrapper experimentId={params.experimentId} />
      </Suspense>
    </div>
  )
}
