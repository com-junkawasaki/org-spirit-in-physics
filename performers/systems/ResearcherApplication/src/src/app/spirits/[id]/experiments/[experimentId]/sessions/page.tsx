'use client'

//! Sessions List Page for Experiment
//! 
//! Merkle DAG: spirits.experiments.sessions.list -> session_selection
//! OWL: spirit:Session list view for experiment
//! 
//! 特定の実験に含まれるセッション一覧を表示。各実験はsession-1とsession-2から構成される。

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
  Activity,
  ChevronRight
} from 'lucide-react'
import { useSessionsByParticipant } from '@/lib/graphql/hooks'

export default function SessionsListPage() {
  const params = useParams()
  const router = useRouter()
  const participantId = params.id as string
  const experimentId = params.experimentId as string

  const { data, loading, error } = useSessionsByParticipant(participantId)

  // 特定の実験に含まれるセッションをフィルタリング
  const sessions = useMemo(() => {
    if (!data?.sessionsByParticipant) return []

    return data.sessionsByParticipant
      .filter(session => (session.sessionId || session.id) === experimentId)
      .sort((a, b) => {
        // session-1を先に、次にsession-2
        if (a.sessionType === 'session-1' && b.sessionType === 'session-2') return -1
        if (a.sessionType === 'session-2' && b.sessionType === 'session-1') return 1
        return a.startTime.localeCompare(b.startTime)
      })
  }, [data, experimentId])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Activity className="h-12 w-12 text-blue-600 animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">セッションデータを読み込み中...</p>
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

  const session1 = sessions.find(s => s.sessionType === 'session-1')
  const session2 = sessions.find(s => s.sessionType === 'session-2')

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link href={`/spirits/${participantId}/experiments`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                実験一覧に戻る
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                セッション一覧
              </h1>
              <p className="text-muted-foreground">
                実験ID: {experimentId.slice(0, 8)}...
              </p>
            </div>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">セッション数</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions.length} / 2</div>
              <p className="text-xs text-muted-foreground">
                各実験は2セッションで構成
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">実験開始日</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {sessions.length > 0 
                  ? new Date(sessions[0].startTime).toLocaleDateString('ja-JP')
                  : 'なし'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                最初のセッション開始時刻
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* セッション一覧 */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">この実験にはセッションデータがありません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* セッション-1 */}
          {session1 ? (
            <Card 
              className="hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/spirits/${participantId}/experiments/${experimentId}/sessions/${session1.id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">セッション-1（前半100単語）</CardTitle>
                      <CardDescription>
                        セッションID: {session1.id.slice(0, 8)}...
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">開始時刻</span>
                    <span className="text-sm font-medium">
                      {new Date(session1.startTime).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  {session1.endTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">終了時刻</span>
                      <span className="text-sm font-medium">
                        {new Date(session1.endTime).toLocaleString('ja-JP')}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Badge variant="default" className="bg-blue-600">
                      {session1.endTime ? '完了' : '進行中'}
                    </Badge>
                    <Link
                      href={`/spirits/${participantId}/experiments/${experimentId}/sessions/${session1.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="default" size="sm">
                        詳細を表示
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="opacity-50">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">セッション-1のデータがありません</p>
              </CardContent>
            </Card>
          )}

          {/* セッション-2 */}
          {session2 ? (
            <Card 
              className="hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/spirits/${participantId}/experiments/${experimentId}/sessions/${session2.id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Activity className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">セッション-2（後半100単語）</CardTitle>
                      <CardDescription>
                        セッションID: {session2.id.slice(0, 8)}...
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">開始時刻</span>
                    <span className="text-sm font-medium">
                      {new Date(session2.startTime).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  {session2.endTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">終了時刻</span>
                      <span className="text-sm font-medium">
                        {new Date(session2.endTime).toLocaleString('ja-JP')}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Badge variant="default" className="bg-green-600">
                      {session2.endTime ? '完了' : '進行中'}
                    </Badge>
                    <Link
                      href={`/spirits/${participantId}/experiments/${experimentId}/sessions/${session2.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="default" size="sm">
                        詳細を表示
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="opacity-50">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">セッション-2のデータがありません</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

