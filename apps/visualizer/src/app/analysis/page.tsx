'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SystemStatusCard } from '@/components/SystemStatusCard'
import { ArrowRight, Home, Database, Activity, Users } from 'lucide-react'

type Run = {
  _key: string
  participant_id: string
  status: string
  progress?: number
  created_at: string
  updated_at?: string
}

type ImportJob = {
  id: string
  sessionId: string
  participantId: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  createdAt: string
  completedAt?: string
  error?: string
  progress?: number
}

type ParticipantData = {
  id: string
  name: string
  sessionsCount: number
  responsesCount: number
  lastActivity: string
  hasConsent: boolean
  hasVideoFiles: boolean
  hasHumeData: boolean
}

type SystemStatus = {
  arangodb: 'connected' | 'disconnected' | 'error'
  temporal: 'connected' | 'disconnected' | 'error'
  humeAI: 'connected' | 'disconnected' | 'error'
  activeJobs: number
  completedJobs: number
  failedJobs: number
}

import { redirect } from 'next/navigation'

export default function AnalysisPage() {
  redirect('/data-management')
}

export default function DataManagementPage() {
  // Analysis state
  const [runs, setRuns] = useState<Run[]>([])
  const [analysisLoading, setAnalysisLoading] = useState(true)
  const [creatingAnalysis, setCreatingAnalysis] = useState(false)
  const [temporalMsg, setTemporalMsg] = useState<string | null>(null)

  // Import state
  const [importJobs, setImportJobs] = useState<ImportJob[]>([])
  const [participants, setParticipants] = useState<ParticipantData[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    arangodb: 'disconnected',
    temporal: 'disconnected',
    humeAI: 'disconnected',
    activeJobs: 0,
    completedJobs: 0,
    failedJobs: 0
  })
  const [importsLoading, setImportsLoading] = useState(true)

  async function fetchAnalysisData() {
    setAnalysisLoading(true)
    try {
      const res = await fetch('/api/analysis/runs', { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        setRuns(json)
      }
    } finally {
      setAnalysisLoading(false)
    }
  }

  async function fetchImportsData() {
    setImportsLoading(true)
    try {
      // System status
      const statusResponse = await fetch('/api/imports/status')
      if (statusResponse.ok) {
        const status = await statusResponse.json()
        setSystemStatus(status)
      }

      // Import jobs
      const jobsResponse = await fetch('/api/imports/jobs')
      if (jobsResponse.ok) {
        const jobs = await jobsResponse.json()
        setImportJobs(jobs)
      }

      // Participants
      const participantsResponse = await fetch('/api/participants')
      if (participantsResponse.ok) {
        const participantsData = await participantsResponse.json()
        setParticipants(participantsData)
      }
    } catch (error) {
      console.error('Failed to fetch imports data:', error)
    } finally {
      setImportsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalysisData()
    fetchImportsData()

    // Real-time updates for imports data
    const interval = setInterval(fetchImportsData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Import management functions
  const startImportJob = async (sessionId: string) => {
    try {
      const response = await fetch('/api/imports/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })

      if (response.ok) {
        fetchImportsData()
      }
    } catch (error) {
      console.error('Failed to start import job:', error)
    }
  }

  const retryFailedJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/imports/retry/${jobId}`, {
        method: 'POST'
      })

      if (response.ok) {
        fetchImportsData()
      }
    } catch (error) {
      console.error('Failed to retry job:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'RUNNING': 'bg-blue-100 text-blue-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'FAILED': 'bg-red-100 text-red-800'
    }

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {status}
      </Badge>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">
              データ管理ダッシュボード
            </h1>
            <p className="text-muted-foreground">
              Spirit in Physics実験データのインポート・分析・監視を統合管理します
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <Home className="h-4 w-4 mr-2" />
                ダッシュボード
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={async () => {
                setTemporalMsg(null)
                const res = await fetch('/api/temporal/worker/start', { method: 'POST' })
                setTemporalMsg(res.ok ? 'Temporal worker started' : 'Temporal worker failed')
              }}
            >
              Worker起動
            </Button>
          </div>
        </div>
      </div>

      {/* System Status and Job Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SystemStatusCard />

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">ジョブ統計</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{systemStatus.activeJobs}</div>
              <div className="text-sm text-muted-foreground">実行中</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{systemStatus.completedJobs}</div>
              <div className="text-sm text-muted-foreground">完了</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{systemStatus.failedJobs}</div>
              <div className="text-sm text-muted-foreground">失敗</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="analysis" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            分析実行
          </TabsTrigger>
          <TabsTrigger value="imports" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            データインポート
          </TabsTrigger>
          <TabsTrigger value="participants" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            参加者データ
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            ログ
          </TabsTrigger>
        </TabsList>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">分析実行管理</h2>
              <div className="flex items-center gap-2">
                <Button onClick={fetchAnalysisData} variant="outline" size="sm">
                  更新
                </Button>
                <Button
                  onClick={async () => {
                    setCreatingAnalysis(true)
                    try {
                      const res = await fetch('http://localhost:8000/api/workflows/start-analysis', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          sessionIds: ['session-1', 'session-2'],
                          modelVersion: '1.0',
                          notes: 'Started from unified dashboard'
                        })
                      })
                      if (res.ok) {
                        await fetchAnalysisData()
                      }
                    } finally {
                      setCreatingAnalysis(false)
                    }
                  }}
                  disabled={creatingAnalysis}
                >
                  {creatingAnalysis ? '起動中…' : '新規解析を起動'}
                </Button>
              </div>
            </div>

            {temporalMsg && (
              <div className="mb-2 text-xs text-muted-foreground">{temporalMsg}</div>
            )}

            {analysisLoading ? (
              <div className="text-sm text-muted-foreground">読み込み中…</div>
            ) : runs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                実行履歴がありません
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Run ID</th>
                      <th className="py-2 pr-4">Participant</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Progress</th>
                      <th className="py-2 pr-4">Created</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r._key} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs">{r._key}</td>
                        <td className="py-2 pr-4">
                          <Link className="text-primary underline" href={`/participants/${r.participant_id}/results`}>
                            {r.participant_id}
                          </Link>
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant={r.status === 'completed' ? 'default' : r.status === 'failed' ? 'destructive' : 'secondary'}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4">{typeof r.progress === 'number' ? `${r.progress}%` : '-'}</td>
                        <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString('ja-JP')}</td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/analysis/${r._key}/pipeline`, '_blank')}
                            >
                              パイプライン
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Import Jobs Tab */}
        <TabsContent value="imports" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">データインポートジョブ</h2>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                更新
              </Button>
            </div>

            <div className="space-y-4">
              {importsLoading ? (
                <div className="text-center py-8">読み込み中...</div>
              ) : importJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  インポートジョブがありません
                </div>
              ) : (
                importJobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">セッション: {job.sessionId}</div>
                        <div className="text-sm text-muted-foreground">
                          参加者: {job.participantId}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(job.status)}
                        {job.status === 'FAILED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryFailedJob(job.id)}
                          >
                            リトライ
                          </Button>
                        )}
                        {job.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startImportJob(job.sessionId)}
                          >
                            開始
                          </Button>
                        )}
                      </div>
                    </div>

                    {job.progress && (
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">進捗</div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${job.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {job.error && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        エラー: {job.error}
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      作成: {new Date(job.createdAt).toLocaleString('ja-JP')}
                      {job.completedAt && (
                        <> | 完了: {new Date(job.completedAt).toLocaleString('ja-JP')}</>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">参加者データ状況</h2>

            <div className="space-y-4">
              {importsLoading ? (
                <div className="text-center py-8">読み込み中...</div>
              ) : participants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  参加者データがありません
                </div>
              ) : (
                participants.map((participant) => (
                  <div key={participant.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">{participant.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {participant.id}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {participant.hasConsent && (
                          <Badge variant="secondary">同意書</Badge>
                        )}
                        {participant.hasVideoFiles && (
                          <Badge variant="secondary">動画</Badge>
                        )}
                        {participant.hasHumeData && (
                          <Badge variant="secondary">感情データ</Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">セッション数:</span>
                        <span className="ml-2 font-medium">{participant.sessionsCount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">応答数:</span>
                        <span className="ml-2 font-medium">{participant.responsesCount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">最終活動:</span>
                        <span className="ml-2 font-medium">
                          {new Date(participant.lastActivity).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">システムログ</h2>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
              <div>2024-01-15 10:30:15 [INFO] ArangoDB接続確認: OK</div>
              <div>2024-01-15 10:30:16 [INFO] Temporal接続確認: OK</div>
              <div>2024-01-15 10:30:17 [INFO] Hume AI接続確認: OK</div>
              <div>2024-01-15 10:30:18 [INFO] インポートジョブ監視開始</div>
              <div>2024-01-15 10:30:19 [INFO] 参加者データ同期完了</div>
              <div className="text-yellow-400">2024-01-15 10:30:20 [WARN] 一部のセッションで動画ファイルが見つかりません</div>
              <div>2024-01-15 10:30:21 [INFO] システムステータス更新完了</div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


