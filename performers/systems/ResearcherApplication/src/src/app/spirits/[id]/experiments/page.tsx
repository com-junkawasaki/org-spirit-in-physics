'use client'

//! Experiments List Page
//! 
//! Merkle DAG: spirits.experiments.list -> experiment_selection
//! OWL: spirit:Experiment list view
//! 
//! 参加者の実験一覧を表示。実験（experiment）はsession_idでグループ化されたセッションの集合。
//! 各実験はsession-1とsession-2の2つのセッションから構成される。

import React, { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Button,
  Badge
} from '@spiritinphysics/components'
import { 
  ArrowLeft, 
  FlaskConical, 
  Clock, 
  Calendar,
  ChevronRight,
  Activity
} from 'lucide-react'
import { useSessionsByParticipant } from '@/lib/graphql/hooks'

interface ExperimentGroup {
  sessionId: string
  sessions: Array<{
    id: string
    sessionId: string
    sessionType: string
    startTime: string
    endTime: string | null
    createdAt: string
    updatedAt: string
  }>
  earliestStartTime: string
  latestEndTime: string | null
}

export default function ExperimentsListPage() {
  const params = useParams()
  const router = useRouter()
  const participantId = params.id as string

  const { data, loading, error } = useSessionsByParticipant(participantId)

  // セッションをsession_idでグループ化して実験として整理
  const experiments = useMemo<ExperimentGroup[]>(() => {
    if (!data?.sessionsByParticipant) return []

    const grouped = new Map<string, ExperimentGroup['sessions']>()
    
    data.sessionsByParticipant.forEach((session) => {
      const sessionId = session.sessionId || session.id
      if (!grouped.has(sessionId)) {
        grouped.set(sessionId, [])
      }
      grouped.get(sessionId)!.push({
        id: session.id,
        sessionId: session.sessionId,
        sessionType: session.sessionType,
        startTime: session.startTime,
        endTime: session.endTime || null,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })
    })

    return Array.from(grouped.entries()).map(([sessionId, sessions]) => {
      const sortedSessions = sessions.sort((a, b) => 
        a.startTime.localeCompare(b.startTime)
      )
      
      const startTimes = sortedSessions.map(s => new Date(s.startTime))
      const endTimes = sortedSessions
        .map(s => s.endTime ? new Date(s.endTime) : null)
        .filter((d): d is Date => d !== null)

      return {
        sessionId,
        sessions: sortedSessions,
        earliestStartTime: sortedSessions[0].startTime,
        latestEndTime: endTimes.length > 0 
          ? new Date(Math.max(...endTimes.map(d => d.getTime()))).toISOString()
          : null,
      }
    }).sort((a, b) => 
      b.earliestStartTime.localeCompare(a.earliestStartTime)
    )
  }, [data])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Activity className="h-12 w-12 text-blue-600 animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">実験データを読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <FlaskConical className="h-12 w-12 mx-auto mb-2" />
            <h2 className="text-xl font-bold">エラーが発生しました</h2>
          </div>
          <p className="text-muted-foreground mb-4">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link href="/spirits">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                一覧に戻る
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                実験一覧
              </h1>
              <p className="text-muted-foreground">
                参加者ID: {participantId}
              </p>
            </div>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総実験数</CardTitle>
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{experiments.length}</div>
              <p className="text-xs text-muted-foreground">
                各実験は2セッション（前半・後半）で構成
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総セッション数</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.sessionsByParticipant?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                セッション-1とセッション-2の合計
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">最新実験</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {experiments.length > 0 
                  ? new Date(experiments[0].earliestStartTime).toLocaleDateString('ja-JP')
                  : 'なし'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                開始日時
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 実験一覧 */}
      {experiments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">実験データがありません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {experiments.map((experiment) => {
            const session1 = experiment.sessions.find(s => s.sessionType === 'session-1')
            const session2 = experiment.sessions.find(s => s.sessionType === 'session-2')
            
            return (
              <Card 
                key={experiment.sessionId}
                className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/spirits/${participantId}/experiments/${experiment.sessionId}/sessions`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <FlaskConical className="h-6 w-6 text-blue-600" />
                      <div>
                        <CardTitle className="text-lg">
                          実験 {experiment.sessionId.slice(0, 8)}...
                        </CardTitle>
                        <CardDescription>
                          実験ID: {experiment.sessionId}
                        </CardDescription>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* セッション1 */}
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                      <Badge variant={session1 ? 'default' : 'secondary'}>
                        {session1 ? '完了' : '未実施'}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium text-sm">セッション-1（前半100単語）</p>
                        {session1 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {new Date(session1.startTime).toLocaleString('ja-JP')}
                          </div>
                        )}
                      </div>
                      {session1 && (
                        <Link
                          href={`/spirits/${participantId}/experiments/${experiment.sessionId}/sessions/${session1.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm">
                            詳細
                          </Button>
                        </Link>
                      )}
                    </div>

                    {/* セッション2 */}
                    <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                      <Badge variant={session2 ? 'default' : 'secondary'}>
                        {session2 ? '完了' : '未実施'}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium text-sm">セッション-2（後半100単語）</p>
                        {session2 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {new Date(session2.startTime).toLocaleString('ja-JP')}
                          </div>
                        )}
                      </div>
                      {session2 && (
                        <Link
                          href={`/spirits/${participantId}/experiments/${experiment.sessionId}/sessions/${session2.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm">
                            詳細
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex items-center space-x-4">
                      <span>
                        開始: {new Date(experiment.earliestStartTime).toLocaleString('ja-JP')}
                      </span>
                      {experiment.latestEndTime && (
                        <span>
                          終了: {new Date(experiment.latestEndTime).toLocaleString('ja-JP')}
                        </span>
                      )}
                    </div>
                    <Badge variant="outline">
                      {experiment.sessions.length} / 2 セッション
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

