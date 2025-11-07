'use client'

import { useQuery, gql } from '@apollo/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  Calendar, 
  Activity, 
  TrendingUp, 
  Clock,
} from 'lucide-react'

const PARTICIPANTS_QUERY = gql`
  query GetParticipants {
    participants
  }
`;

const PARTICIPANT_QUERY = gql`
  query GetParticipant($participantId: String!) {
    participant(participantId: $participantId)
  }
`;

interface ParticipantSummary {
  id: string
  name: string
  sessionCount: number
  responseCount: number
  averageSpiritProbability: number
  lastActivity: string
  hasConsent: boolean
  hasVideoFiles: boolean
  hasHumeData: boolean
}

interface ParticipantOverviewProps {
  participantId?: string
}

export function ParticipantOverview({ participantId }: ParticipantOverviewProps) {
  const query = participantId ? PARTICIPANT_QUERY : PARTICIPANTS_QUERY;
  const variables = participantId ? { participantId } : {};
  const { data, loading, error } = useQuery(query, {
    variables,
    pollInterval: 60000,
  });

  if (loading && !data) {
    // Loading skeleton UI
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={`loading-card-${i}`}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div>Error loading participant data.</div>;
  }
  
  const participantsData = participantId 
    ? (data && data.participant ? [JSON.parse(data.participant)] : [])
    : (data && data.participants ? JSON.parse(data.participants) : []);

  const participants: ParticipantSummary[] = participantsData.map((p: any) => ({
    id: p.id,
    name: p.name || `参加者 ${p.id.slice(0, 8)}`,
    sessionCount: p.sessionCount || p.session_count || 0,
    responseCount: p.responseCount || p.total_responses || 0,
    averageSpiritProbability: p.averageSpiritProbability || p.average_spirit_probability || 0,
    lastActivity: p.lastActivity || p.last_activity || new Date().toISOString(),
    hasConsent: true,
    hasVideoFiles: false,
    hasHumeData: false,
  }));

  const summary = participants.length > 0
    ? {
        totalParticipants: participants.length,
        totalSessions: participants.reduce((sum, p) => sum + p.sessionCount, 0),
        totalResponses: participants.reduce((sum, p) => sum + p.responseCount, 0),
        averageSpiritProbability: participants.reduce((sum, p) => sum + p.averageSpiritProbability, 0) / participants.length,
        activeParticipants: participants.filter(p => new Date(p.lastActivity) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length
      }
    : {
        totalParticipants: 0, totalSessions: 0, totalResponses: 0, averageSpiritProbability: 0, activeParticipants: 0
      };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">総参加者数</p>
                <p className="text-2xl font-bold">{summary.totalParticipants}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">総セッション数</p>
                <p className="text-2xl font-bold">{summary.totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">総応答数</p>
                <p className="text-2xl font-bold">{summary.totalResponses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">平均Spirit確率</p>
                <p className="text-2xl font-bold">
                  {(summary.averageSpiritProbability * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">アクティブ参加者</p>
                <p className="text-2xl font-bold">{summary.activeParticipants}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}