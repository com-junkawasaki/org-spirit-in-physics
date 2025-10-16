// Merkle DAG: experiment_sessions_page -> session_list_display
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Activity, Clock, Users, BarChart3 } from 'lucide-react'

interface Session {
  id: string
  sessionType: string
  startTime: string
  endTime?: string
  participantId: string
  participantName: string
  responseCount: number
  averageSpiritProbability: number
  status: 'completed' | 'in_progress' | 'failed'
}

// Placeholder data - will be replaced with Neo4j query
async function getExperimentSessions(experimentId: string): Promise<Session[]> {
  // TODO: Implement Neo4j query for experiment sessions
  return [
    {
      id: 'session-001',
      sessionType: 'Word Association Test',
      startTime: '2024-10-01T10:00:00Z',
      endTime: '2024-10-01T11:30:00Z',
      participantId: 'participant-001',
      participantName: 'Participant A',
      responseCount: 100,
      averageSpiritProbability: 0.724,
      status: 'completed'
    },
    {
      id: 'session-002',
      sessionType: 'Word Association Test',
      startTime: '2024-10-02T14:00:00Z',
      endTime: '2024-10-02T15:30:00Z',
      participantId: 'participant-002',
      participantName: 'Participant B',
      responseCount: 95,
      averageSpiritProbability: 0.689,
      status: 'completed'
    }
  ]
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'bg-green-500'
    case 'in_progress': return 'bg-blue-500'
    case 'failed': return 'bg-red-500'
    default: return 'bg-gray-500'
  }
}

function SessionsTable({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">セッションが見つかりません</h3>
        <p className="text-sm text-muted-foreground mt-2">
          この実験にはまだセッションが登録されていません。
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>セッション</TableHead>
            <TableHead>参加者</TableHead>
            <TableHead>開始時刻</TableHead>
            <TableHead>終了時刻</TableHead>
            <TableHead>応答数</TableHead>
            <TableHead>平均Spirit確率</TableHead>
            <TableHead>ステータス</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{session.sessionType}</div>
                  <div className="text-sm text-muted-foreground">
                    {session.id.slice(0, 12)}...
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{session.participantName}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDateTime(session.startTime)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {session.endTime ? formatDateTime(session.endTime) : 'N/A'}
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span>{session.responseCount}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {(session.averageSpiritProbability * 100).toFixed(1)}%
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(session.status)}>
                  {session.status === 'completed' ? '完了' : 
                   session.status === 'in_progress' ? '進行中' : '失敗'}
                </Badge>
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
            <TableHead>セッション</TableHead>
            <TableHead>参加者</TableHead>
            <TableHead>開始時刻</TableHead>
            <TableHead>終了時刻</TableHead>
            <TableHead>応答数</TableHead>
            <TableHead>平均Spirit確率</TableHead>
            <TableHead>ステータス</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {skeletonKeys.map((key) => (
            <TableRow key={key} className="animate-pulse">
              <TableCell>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-3 bg-muted rounded w-24"></div>
                </div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded w-24"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded w-32"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded w-32"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded w-8"></div>
              </TableCell>
              <TableCell>
                <div className="h-6 bg-muted rounded w-12"></div>
              </TableCell>
              <TableCell>
                <div className="h-6 bg-muted rounded w-16"></div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

async function SessionsTableWrapper({ experimentId }: { experimentId: string }) {
  const sessions = await getExperimentSessions(experimentId)
  if (!sessions || sessions.length === 0) {
    return <LoadingSkeleton />
  }
  return <SessionsTable sessions={sessions} />
}

export default async function ExperimentSessionsPage({ 
  params 
}: { 
  params: { experimentId: string } 
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            セッション一覧
          </h2>
          <p className="text-muted-foreground">
            実験 {params.experimentId} のセッション一覧
          </p>
        </div>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <SessionsTableWrapper experimentId={params.experimentId} />
      </Suspense>
    </div>
  )
}
