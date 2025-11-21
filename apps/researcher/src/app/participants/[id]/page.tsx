'use client'

<<<<<<< HEAD
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/PageLayout'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Calendar, Clock } from 'lucide-react'

interface Session {
  id: string
  sessionIndex?: number
  createdAt?: string
  startTs?: number
  endTs?: number | null
}

export default function ParticipantPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const participantId = params?.id
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSessions() {
      if (!participantId) {
        setError('参加者IDが取得できませんでした')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/participants/${participantId}/sessions`)
        const data = await response.json()
        
        if (!response.ok) {
          const errorMessage = data.error || `HTTP ${response.status}: ${response.statusText}`
          const errorDetails = data.details ? `\n詳細: ${data.details}` : ''
          throw new Error(`${errorMessage}${errorDetails}`)
        }
        
        if (!data.sessions) {
          throw new Error('Invalid response format: sessions array not found')
        }
        
        setSessions(data.sessions || [])
      } catch (err: any) {
        console.error('[ParticipantPage] Error fetching sessions:', err)
        setError(err.message || 'Failed to load sessions')
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
  }, [participantId])

  const formatDate = (timestamp?: number | string | null): string => {
    if (!timestamp) return 'N/A'
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp)
    return date.toLocaleString('ja-JP')
  }

  const formatDuration = (startTs?: number, endTs?: number | null): string => {
    if (!startTs || !endTs) return 'N/A'
    const duration = (endTs - startTs) / 1000 // Convert to seconds
    const minutes = Math.floor(duration / 60)
    const seconds = Math.floor(duration % 60)
    return `${minutes}分${seconds}秒`
  }

  // セッションが1つの場合は自動的にそのセッションにリダイレクト
  useEffect(() => {
    if (!loading && sessions.length === 1) {
      router.push(`/participants/${participantId}/sessions/${sessions[0].id}#timeline`)
    }
  }, [loading, sessions, participantId, router])

  // Early return if participantId is not available
  if (!participantId) {
    return (
      <DashboardLayout
        header={{
          title: '参加者情報',
          backHref: '/participants',
          backLabel: '参加者一覧へ'
        }}
      >
        <Card className="border-destructive">
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-destructive font-semibold mb-2">エラーが発生しました</p>
              <p className="text-sm text-muted-foreground">参加者IDが取得できませんでした</p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }
=======
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/PageLayout'
import { TimelineVisualization } from '@visualizer'

export default function ForceTimelinePage() {
  const { id } = useParams<{ id: string }>()
  const [participantId, setParticipantId] = useState<string>(id || '')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewport, setViewport] = useState<{ width: number; height: number }>({ width: 960, height: 540 })

  // ルートパラメータと状態を同期
  useEffect(() => {
    if (id && id !== participantId) setParticipantId(id)
  }, [id])

  // iPad向け: コンテナにフィットするキャンバスサイズを算出（1画面に収める）
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current

    const compute = () => {
      const rect = el.getBoundingClientRect()
      const safeTop = (window as any).visualViewport?.offsetTop || 0
      const safeBottomInset = 0 // bodyにenv(safe-area-inset-bottom)を適用済
      const headerReserved = 56 // compact header 高さ相当
      const controlsReserved = 48 // コントロール行の高さ相当
      const verticalPadding = 16 // container-ipad の余白相当

      const height = Math.max(320, Math.floor((window.innerHeight - safeTop - safeBottomInset - headerReserved - controlsReserved - verticalPadding * 2)))
      const width = Math.max(600, Math.floor(rect.width))
      setViewport({ width, height })
    }

    compute()
    const ro = new ResizeObserver(() => compute())
    ro.observe(el)
    window.addEventListener('orientationchange', compute)
    window.addEventListener('resize', compute)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', compute)
      window.removeEventListener('resize', compute)
    }
  }, [])
>>>>>>> origin/main

  return (
    <DashboardLayout
      header={{
<<<<<<< HEAD
        title: `参加者 ${participantId.slice(0, 8)}...`,
        backHref: '/participants',
        backLabel: '参加者一覧へ'
      }}
    >
      {loading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-destructive font-semibold mb-2">エラーが発生しました</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{error}</p>
            </div>
          </CardContent>
        </Card>
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
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2">セッション一覧</h2>
                <p className="text-muted-foreground">
                  {sessions.length}件のセッションが見つかりました
                </p>
              </div>
              <div className="space-y-4">
                {sessions.map((session) => (
                  <Card key={session.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            セッション {session.sessionIndex !== undefined ? `#${session.sessionIndex + 1}` : session.id.slice(0, 8)}
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
            </>
          )}
        </>
      )}
=======
        title: '3D Force Timeline',
        // compact header により説明は省略し冗長さを削減
        backHref: '/participants',
        backLabel: '参加者一覧へ'
      }}
      compact
    >
      <div ref={containerRef} className="mb-3 md:mb-4" />

      <TimelineVisualization
        participantId={participantId}
        width={viewport.width}
        height={viewport.height}
        hideFilters
      />
>>>>>>> origin/main
    </DashboardLayout>
  )
}


