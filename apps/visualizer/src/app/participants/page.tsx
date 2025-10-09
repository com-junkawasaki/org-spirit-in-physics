'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Activity, Brain, ArrowRight } from 'lucide-react'

interface Participant {
  id: string
  name: string
  sessionCount: number
  responseCount: number
  averageSpiritProbability: number
  lastActivity: number | null
  sessions: Array<{
    id: string
    sessionType: string
    startTime: string
    endTime: string | null
    responseCount: number
  }>
}

async function getParticipants(): Promise<Participant[]> {
  try {
    console.log('Fetching participants from:', '/api/participants')
    const response = await fetch('/api/participants', {
      cache: 'no-store'
    })

    console.log('Response status:', response.status)
    console.log('Response ok:', response.ok)

    if (!response.ok) {
      throw new Error(`Failed to fetch participants: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Fetched data:', data)
    return data
  } catch (error) {
    console.error('Failed to fetch participants:', error)
    return []
  }
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
  if (probability >= 0.99) return 'bg-green-100 text-green-800'
  if (probability >= 0.95) return 'bg-blue-100 text-blue-800'
  if (probability >= 0.90) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

function ParticipantCard({ participant }: { participant: Participant }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{participant.name}</CardTitle>
            <p className="text-sm text-muted-foreground">ID: {participant.id.slice(0, 8)}...</p>
          </div>
          <Badge className={getSpiritProbabilityColor(participant.averageSpiritProbability)}>
            {(participant.averageSpiritProbability * 100).toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-medium">{participant.sessionCount}</span> セッション
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-medium">{participant.responseCount}</span> 応答
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <span>最終活動:</span>
          <span>{formatDate(participant.lastActivity)}</span>
        </div>

        <Link href={`/participants/${participant.id}`}>
          <Button variant="outline" size="sm" className="w-full">
            詳細を見る
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

function ParticipantsTable({ participants }: { participants: Participant[] }) {
  if (participants.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">参加者が見つかりません</h3>
        <p className="text-sm text-muted-foreground mt-2">
          データが読み込まれていないか、エラーが発生しています。
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {participants.map((participant) => (
        <ParticipantCard key={participant.id} participant={participant} />
      ))}
    </div>
  )
}

function LoadingSkeleton() {
  const skeletonKeys = ['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5', 'sk-6']
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {skeletonKeys.map((key) => (
        <Card key={key} className="animate-pulse">
          <CardHeader className="pb-3">
            <div className="h-6 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded"></div>
            </div>
            <div className="h-4 bg-muted rounded mb-4"></div>
            <div className="h-9 bg-muted rounded"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ParticipantsTableWrapper() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchParticipants() {
      try {
        const response = await fetch('/api/participants', {
          cache: 'no-store'
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch participants: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        setParticipants(data)
      } catch (error) {
        console.error('Failed to fetch participants:', error)
        setParticipants([])
      } finally {
        setLoading(false)
      }
    }

    fetchParticipants()
  }, [])

  if (loading) {
    return <LoadingSkeleton />
  }

  return <ParticipantsTable participants={participants} />
}

export default function ParticipantsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          被験者一覧
        </h1>
        <p className="text-muted-foreground">
          Spirit in Physics実験に参加した被験者の検査結果一覧です。各被験者の詳細な分析結果を確認できます。
        </p>
      </div>

      <ParticipantsTableWrapper />
    </div>
  )
}
