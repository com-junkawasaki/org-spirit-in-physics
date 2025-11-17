'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/PageLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, Clock, ArrowRight } from 'lucide-react'

interface Session {
  id: string
  sessionIndex?: number
  createdAt?: string
  startTs?: number
  endTs?: number | null
}

export default function SessionsListPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const participantId = params.id
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true)
        const response = await fetch(`/api/participants/${participantId}/sessions`)
        if (!response.ok) {
          throw new Error('Failed to fetch sessions')
        }
        const data = await response.json()
        setSessions(data.sessions || [])
      } catch (err: any) {
        setError(err.message || 'Failed to load sessions')
      } finally {
        setLoading(false)
      }
    }

    if (participantId) {
      fetchSessions()
    }
  }, [participantId])

  const formatDate = (timestamp?: number | string | null): string => {
    if (!timestamp) return 'N/A'
    // Neo4j Integer型のオブジェクトが来た場合の処理
    if (typeof timestamp === 'object' && timestamp !== null && 'low' in timestamp) {
      const num = (timestamp as any).low
      const date = new Date(num)
      return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString('ja-JP')
    }
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp)
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString('ja-JP')
  }

  const formatDuration = (startTs?: number, endTs?: number | null): string => {
    if (!startTs || !endTs) return 'N/A'
    // Neo4j Integer型のオブジェクトが来た場合の処理（念のため）
    let start = startTs
    let end = endTs
    if (typeof startTs === 'object' && startTs !== null && 'low' in startTs) {
      start = (startTs as any).low
    }
    if (typeof endTs === 'object' && endTs !== null && 'low' in endTs) {
      end = (endTs as any).low
    }
    if (!start || !end) return 'N/A'
    const duration = (Number(end) - Number(start)) / 1000 // Convert to seconds
    if (duration < 0) return 'N/A'
    const minutes = Math.floor(duration / 60)
    const seconds = Math.floor(duration % 60)
    return `${minutes}分${seconds}秒`
  }

  return (
    <DashboardLayout
      header={{
        title: 'セッション一覧',
        backHref: `/participants/${participantId}`,
        backLabel: '参加者詳細へ'
      }}
    >
      {loading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  セッションが見つかりませんでした
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          セッション {(() => {
                            // sessionIndexがオブジェクトの場合の処理（念のため）
                            let index = session.sessionIndex
                            if (typeof index === 'object' && index !== null && 'low' in index) {
                              index = (index as any).low
                            }
                            return index !== undefined && index !== null ? `#${Number(index) + 1}` : session.id.slice(0, 8)
                          })()}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          ID: {session.id}
                        </CardDescription>
                      </div>
                      <Link href={`/participants/${participantId}/sessions/${session.id}#timeline`}>
                        <Button variant="outline" size="sm">
                          タイムラインを見る
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">開始:</span>
                        <span>{formatDate(session.startTs || session.createdAt)}</span>
                      </div>
                      {session.endTs && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">終了:</span>
                          <span>{formatDate(session.endTs)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">継続時間:</span>
                        <span>{formatDuration(session.startTs, session.endTs)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}

