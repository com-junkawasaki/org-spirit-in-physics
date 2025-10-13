'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SystemStatusCard } from '@/components/SystemStatusCard'
import { ArrowRight, Home } from 'lucide-react'
import Link from 'next/link'

// Merkle DAG: imports_management_page -> import_status_tracking
interface ImportJob {
  id: string
  sessionId: string
  participantId: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  createdAt: string
  completedAt?: string
  error?: string
  progress?: number
}

// Merkle DAG: imports_management_page -> participant_data_overview
interface ParticipantData {
  id: string
  name: string
  sessionsCount: number
  responsesCount: number
  lastActivity: string
  hasConsent: boolean
  hasVideoFiles: boolean
  hasHumeData: boolean
}

// Merkle DAG: imports_management_page -> system_status_monitoring
interface SystemStatus {
  arangodb: 'connected' | 'disconnected' | 'error'
  temporal: 'connected' | 'disconnected' | 'error'
  humeAI: 'connected' | 'disconnected' | 'error'
  activeJobs: number
  completedJobs: number
  failedJobs: number
}

export default function ImportsPage() {
  // Merkle DAG: imports_management_page -> state_management
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
  const [isLoading, setIsLoading] = useState(true)

  // Merkle DAG: imports_management_page -> data_fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        // システムステータスの取得
        const statusResponse = await fetch('/api/imports/status')
        if (statusResponse.ok) {
          const status = await statusResponse.json()
          setSystemStatus(status)
        }

        // インポートジョブの取得
        const jobsResponse = await fetch('/api/imports/jobs')
        if (jobsResponse.ok) {
          const jobs = await jobsResponse.json()
          setImportJobs(jobs)
        }

        // 参加者データの取得
        const participantsResponse = await fetch('/api/participants')
        if (participantsResponse.ok) {
          const participantsData = await participantsResponse.json()
          setParticipants(participantsData)
        }
      } catch (error) {
        console.error('Failed to fetch imports data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    
    // リアルタイム更新（30秒間隔）
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Merkle DAG: imports_management_page -> job_management_actions
  const startImportJob = async (sessionId: string) => {
    try {
      const response = await fetch('/api/imports/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })
      
      if (response.ok) {
        // ジョブ開始後、データを再取得
        const jobsResponse = await fetch('/api/imports/jobs')
        if (jobsResponse.ok) {
          const jobs = await jobsResponse.json()
          setImportJobs(jobs)
        }
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
        // リトライ後、データを再取得
        const jobsResponse = await fetch('/api/imports/jobs')
        if (jobsResponse.ok) {
          const jobs = await jobsResponse.json()
          setImportJobs(jobs)
        }
      }
    } catch (error) {
      console.error('Failed to retry job:', error)
    }
  }

  // Merkle DAG: imports_management_page -> status_badge_component
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


  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Merkle DAG: imports_management_page -> page_header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">
              データインポート管理
            </h1>
            <p className="text-muted-foreground">
              Spirit in Physics実験データのインポート処理を管理・監視します
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <Home className="h-4 w-4 mr-2" />
                ダッシュボード
              </Button>
            </Link>
            <Link href="/participants">
              <Button variant="outline" size="sm">
                参加者管理
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Merkle DAG: imports_management_page -> system_status_overview */}
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

      {/* Merkle DAG: imports_management_page -> management_tabs */}
      <Tabs defaultValue="jobs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="jobs">インポートジョブ</TabsTrigger>
          <TabsTrigger value="participants">参加者データ</TabsTrigger>
          <TabsTrigger value="logs">ログ</TabsTrigger>
        </TabsList>

        {/* Merkle DAG: imports_management_page -> import_jobs_tab */}
        <TabsContent value="jobs" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">インポートジョブ</h2>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                更新
              </Button>
            </div>
            
            <div className="space-y-4">
              {importJobs.length === 0 ? (
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

        {/* Merkle DAG: imports_management_page -> participants_tab */}
        <TabsContent value="participants" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">参加者データ状況</h2>
            
            <div className="space-y-4">
              {participants.length === 0 ? (
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

        {/* Merkle DAG: imports_management_page -> logs_tab */}
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
