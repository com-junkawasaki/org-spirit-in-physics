'use client'

// Merkle DAG: participant_overview -> participants_summary_dashboard
// Participant overview component for dashboard

import { useState, useEffect, useCallback } from 'react'
import { useParticipants, useParticipant, useSessionsByParticipant } from '@/lib/graphql/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Calendar, 
  Activity, 
  TrendingUp, 
  Clock,
  ArrowRight,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

// Merkle DAG: participant_overview -> participant_data_interface
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
  // Merkle DAG: participant_overview -> state_management
  const [participants, setParticipants] = useState<ParticipantSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState({
    totalParticipants: 0,
    totalSessions: 0,
    totalResponses: 0,
    averageSpiritProbability: 0,
    activeParticipants: 0
  })

  // Merkle DAG: participant_overview -> data_fetching
  // Use GraphQL hooks instead of direct fetch
  const { data: participantsData, loading: participantsLoading, error: participantsError } = useParticipants();
  const { data: participantData, loading: participantLoading } = useParticipant(participantId || '', { skip: !participantId });
  const { data: sessionsData } = useSessionsByParticipant(participantId || '', { skip: !participantId });

  const fetchParticipants = useCallback(async () => {
    try {
      setIsLoading(true)

      if (participantId) {
        // For individual participant view - show only that participant's data
        if (participantData?.participant) {
          const p = participantData.participant;
          const sessions = sessionsData?.sessionsByParticipant || [];
          setParticipants([{
            id: p.id,
            name: `参加者 ${p.id.slice(0, 8)}`,
            sessionCount: sessions.length,
            responseCount: 0, // Would need to fetch from responses table
            averageSpiritProbability: 0, // Would need to calculate from analysis results
            lastActivity: p.updatedAt || p.createdAt,
            hasConsent: true, // Assume consent exists for individual view
            hasVideoFiles: false, // Would need to check actual data
            hasHumeData: false // Would need to check actual data
          }])
        }
      } else {
        // For overview/dashboard view - show all participants
        if (participantsData?.participants) {
          const data = participantsData.participants;
          setParticipants(data.map((p: any) => ({
            id: p.id,
            name: `参加者 ${p.id.slice(0, 8)}`,
            sessionCount: 0, // Would need to fetch sessions separately
            responseCount: 0, // Would need to fetch from responses table
            averageSpiritProbability: 0, // Would need to calculate from analysis results
            lastActivity: p.updatedAt || p.createdAt,
            hasConsent: true,
            hasVideoFiles: false,
            hasHumeData: false
          })))

          // Calculate summary
          setSummary({
            totalParticipants: data.length,
            totalSessions: 0, // Would need to fetch separately
            totalResponses: 0, // Would need to fetch separately
            averageSpiritProbability: 0, // Would need to calculate from analysis results
            activeParticipants: data.filter((p: any) => {
              const lastActivity = new Date(p.updatedAt || p.createdAt || 0)
              const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              return lastActivity > thirtyDaysAgo
            }).length
          })
        }
      }

      // For individual participant view, calculate summary from single participant data
      if (participantId && participants.length > 0) {
        const currentParticipant = participants[0]
        setSummary({
          totalParticipants: 1,
          totalSessions: currentParticipant.sessionCount,
          totalResponses: currentParticipant.responseCount,
          averageSpiritProbability: currentParticipant.averageSpiritProbability,
          activeParticipants: 1 // Individual participant is always "active" in their own view
        })
      }
    } catch (error) {
      console.error('Failed to fetch participants:', error)
    } finally {
      setIsLoading(false)
    }
  }, [participantId, participantsData, participantData, sessionsData, participants])

  useEffect(() => {
    setIsLoading(participantsLoading || participantLoading);
  }, [participantsLoading, participantLoading]);

  useEffect(() => {
    fetchParticipants()
  }, [fetchParticipants])

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'N/A'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Card key={`loading-card-${i + 1}`}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/4"></div>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={`loading-row-${i + 1}`} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

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

      {/* Individual Participant Details - Only show current participant info */}
      <Card>
        <CardHeader>
          <CardTitle>参加者詳細情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-700">{summary.totalSessions}</div>
              <div className="text-sm text-muted-foreground">セッション数</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Activity className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700">{summary.totalResponses}</div>
              <div className="text-sm text-muted-foreground">応答数</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-700">
                {(summary.averageSpiritProbability * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">平均Spirit確率</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-700">{summary.activeParticipants}</div>
              <div className="text-sm text-muted-foreground">アクティブ日数</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}