// Merkle DAG: experiment_timeline_page -> timeline_visualization_display
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Timeline, Clock, Users, Activity } from 'lucide-react'

interface TimelineEvent {
  id: string
  timestamp: string
  type: 'session_start' | 'session_end' | 'participant_join' | 'analysis_complete'
  title: string
  description: string
  participantId?: string
  participantName?: string
  sessionId?: string
}

// Placeholder data - will be replaced with Neo4j query
async function getExperimentTimeline(experimentId: string): Promise<TimelineEvent[]> {
  // TODO: Implement Neo4j query for experiment timeline
  return [
    {
      id: 'event-001',
      timestamp: '2024-10-01T09:00:00Z',
      type: 'participant_join',
      title: 'Participant A が実験に参加',
      description: 'Participant A が実験に参加し、同意書に署名しました。',
      participantId: 'participant-001',
      participantName: 'Participant A'
    },
    {
      id: 'event-002',
      timestamp: '2024-10-01T10:00:00Z',
      type: 'session_start',
      title: 'セッション開始',
      description: 'Participant A の最初のセッションが開始されました。',
      participantId: 'participant-001',
      participantName: 'Participant A',
      sessionId: 'session-001'
    },
    {
      id: 'event-003',
      timestamp: '2024-10-01T11:30:00Z',
      type: 'session_end',
      title: 'セッション終了',
      description: 'Participant A の最初のセッションが終了しました。',
      participantId: 'participant-001',
      participantName: 'Participant A',
      sessionId: 'session-001'
    },
    {
      id: 'event-004',
      timestamp: '2024-10-02T14:00:00Z',
      type: 'session_start',
      title: 'セッション開始',
      description: 'Participant B のセッションが開始されました。',
      participantId: 'participant-002',
      participantName: 'Participant B',
      sessionId: 'session-002'
    },
    {
      id: 'event-005',
      timestamp: '2024-10-16T16:00:00Z',
      type: 'analysis_complete',
      title: '分析完了',
      description: '実験の分析が完了し、結果が生成されました。',
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

function getEventIcon(type: string) {
  switch (type) {
    case 'session_start':
    case 'session_end':
      return <Activity className="h-4 w-4" />
    case 'participant_join':
      return <Users className="h-4 w-4" />
    case 'analysis_complete':
      return <Timeline className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

function getEventColor(type: string): string {
  switch (type) {
    case 'session_start':
      return 'bg-green-500'
    case 'session_end':
      return 'bg-blue-500'
    case 'participant_join':
      return 'bg-purple-500'
    case 'analysis_complete':
      return 'bg-orange-500'
    default:
      return 'bg-gray-500'
  }
}

function TimelineDisplay({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Timeline className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">タイムラインイベントが見つかりません</h3>
        <p className="text-sm text-muted-foreground mt-2">
          この実験にはまだタイムラインイベントが記録されていません。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <Card key={event.id} className="relative">
          <div className="absolute left-4 top-6 w-3 h-3 rounded-full bg-primary"></div>
          <div className="absolute left-5 top-8 w-px h-full bg-border"></div>
          
          <CardContent className="pl-12 pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`p-1 rounded-full ${getEventColor(event.type)}`}>
                    {getEventIcon(event.type)}
                  </div>
                  <h3 className="font-semibold">{event.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {event.description}
                </p>
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <span>{formatDateTime(event.timestamp)}</span>
                  {event.participantName && (
                    <span>参加者: {event.participantName}</span>
                  )}
                  {event.sessionId && (
                    <span>セッション: {event.sessionId.slice(0, 12)}...</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map(i => (
        <Card key={i} className="relative">
          <div className="absolute left-4 top-6 w-3 h-3 rounded-full bg-muted"></div>
          <div className="absolute left-5 top-8 w-px h-full bg-muted"></div>
          
          <CardContent className="pl-12 pt-6">
            <div className="space-y-2">
              <div className="h-6 bg-muted rounded w-48"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-3 bg-muted rounded w-32"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function TimelineWrapper({ experimentId }: { experimentId: string }) {
  const events = await getExperimentTimeline(experimentId)
  if (!events || events.length === 0) {
    return <LoadingSkeleton />
  }
  return <TimelineDisplay events={events} />
}

export default async function ExperimentTimelinePage({ 
  params 
}: { 
  params: { experimentId: string } 
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            タイムライン
          </h2>
          <p className="text-muted-foreground">
            実験 {params.experimentId} の時系列イベント
          </p>
        </div>
        <Button variant="outline">
          <Timeline className="h-4 w-4 mr-2" />
          エクスポート
        </Button>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <TimelineWrapper experimentId={params.experimentId} />
      </Suspense>
    </div>
  )
}
