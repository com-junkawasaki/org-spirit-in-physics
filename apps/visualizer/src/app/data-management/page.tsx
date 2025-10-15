'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataManagementLayout } from '@/components/layout/PageLayout'
import { WorkflowVisualizer } from '@/components/WorkflowVisualizer'
import {
  RefreshCw,
  Database,
  Home,
  Play,
  GitBranch,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Users,
  BarChart3
} from 'lucide-react'

type WorkflowDefinition = {
  id: string
  name: string
  description: string
  version: string
  definition: any
  created_at: string
  updated_at: string
}

type WorkflowExecution = {
  id: string
  workflow_id: string
  status: 'created' | 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string
  completed_at?: string
  data: any
  result?: any
  error?: string
}

export default function DataManagementPage() {
  // Workflow visualization state
  const [workflowData, setWorkflowData] = useState<{
    metadata?: {
      version?: string
      lastUpdated?: string
      totalParticipants?: number
      activeSessions?: number
      completedAnalyses?: number
    }
  } | null>(null)
  const [workflowLoading, setWorkflowLoading] = useState(true)

  // Workflow management state
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([])
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [workflowsLoading, setWorkflowsLoading] = useState(true)
  const [executingWorkflows, setExecutingWorkflows] = useState<Set<string>>(new Set())
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("")

  const fetchWorkflowData = useCallback(async () => {
    setWorkflowLoading(true)
    try {
      const res = await fetch('/api/workflow/status', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setWorkflowData(data)
      } else {
        // Fallback to mock data if API doesn't exist yet
        setWorkflowData({
          metadata: {
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            totalParticipants: 12,
            activeSessions: 8,
            completedAnalyses: 5
          }
        })
      }
    } catch (error) {
      console.error('Failed to fetch workflow data:', error)
      // Fallback to mock data
      setWorkflowData({
        metadata: {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          totalParticipants: 12,
          activeSessions: 8,
          completedAnalyses: 5
        }
      })
    } finally {
      setWorkflowLoading(false)
    }
  }, [])

  const fetchWorkflows = useCallback(async () => {
    setWorkflowsLoading(true)
    try {
      const res = await fetch('/api/workflows')
      if (res.ok) {
        const data = await res.json()
        setWorkflows(data)
      } else {
        // Fallback to mock workflows if API doesn't exist yet
        setWorkflows([
          {
            id: 'unified-pipeline',
            name: 'Unified Pipeline',
            description: 'Complete data ingestion and analysis pipeline',
            version: '1.0',
            definition: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'analysis-only',
            name: 'Analysis Only',
            description: 'Analysis workflow for existing data',
            version: '1.0',
            definition: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'participants-import',
            name: 'Participants Data Import',
            description: 'Import participant data from dataset directory',
            version: '1.0',
            definition: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error)
      // Fallback to mock workflows
      setWorkflows([
        {
          id: 'unified-pipeline',
          name: 'Unified Pipeline',
          description: 'Complete data ingestion and analysis pipeline',
          version: '1.0',
          definition: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'analysis-only',
          name: 'Analysis Only',
          description: 'Analysis workflow for existing data',
          version: '1.0',
          definition: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'participants-import',
          name: 'Participants Data Import',
          description: 'Import participant data from dataset directory',
          version: '1.0',
          definition: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
    } finally {
      setWorkflowsLoading(false)
    }
  }, [])

  const fetchExecutions = useCallback(async () => {
    try {
      const res = await fetch('/api/workflow/executions')
      if (res.ok) {
        const data = await res.json()
        setExecutions(data)
      } else {
        // Fallback to mock executions
        setExecutions([])
      }
    } catch (error) {
      console.error('Failed to fetch executions:', error)
      setExecutions([])
    }
  }, [])

  const executeWorkflow = useCallback(async (workflowId: string) => {
    if (executingWorkflows.has(workflowId)) return

    setExecutingWorkflows(prev => new Set(prev).add(workflowId))

    try {
      let endpoint = `/api/workflows/${workflowId}/execute`

      // Special handling for participants import
      if (workflowId === 'participants-import') {
        endpoint = '/api/workflows/start-participants-import'
      } else if (workflowId === 'unified-pipeline') {
        endpoint = '/api/workflows/start-analysis'
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_id: workflowId, data: {} })
      })

      if (res.ok) {
        const result = await res.json()
        console.log(`Workflow ${workflowId} started:`, result)
        // Refresh executions after a short delay
        setTimeout(fetchExecutions, 2000)
      } else {
        console.error(`Failed to execute workflow ${workflowId}:`, res.status)
      }
    } catch (error) {
      console.error(`Failed to execute workflow ${workflowId}:`, error)
    } finally {
      setExecutingWorkflows(prev => {
        const newSet = new Set(prev)
        newSet.delete(workflowId)
        return newSet
      })
    }
  }, [executingWorkflows, fetchExecutions])

  useEffect(() => {
    fetchWorkflowData()
    fetchWorkflows()
    fetchExecutions()

    // Real-time updates
    const interval = setInterval(() => {
      fetchWorkflowData()
      fetchExecutions()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchWorkflowData, fetchWorkflows, fetchExecutions])

  // Set default selected workflow when workflows are loaded
  useEffect(() => {
    if (workflows.length > 0 && !selectedWorkflowId) {
      setSelectedWorkflowId(workflows[0].id)
    }
  }, [workflows, selectedWorkflowId])

  const handleRefresh = () => {
    fetchWorkflowData()
    fetchWorkflows()
    fetchExecutions()
  }

  const getWorkflowIcon = (workflowId: string) => {
    switch (workflowId) {
      case 'unified-pipeline':
        return <GitBranch className="h-5 w-5" />
      case 'analysis-only':
        return <BarChart3 className="h-5 w-5" />
      case 'participants-import':
        return <Users className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      running: 'default',
      completed: 'default',
      failed: 'destructive',
      cancelled: 'secondary',
      created: 'secondary'
    } as const

    const labels = {
      running: '実行中',
      completed: '完了',
      failed: '失敗',
      cancelled: 'キャンセル',
      created: '作成済み'
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  return (
    <DataManagementLayout
      header={{
        title: 'ワークフロー管理',
        description: 'Spirit in Physics実験システムのワークフロー設計・実行・監視を行います',
        icon: <Database className="h-8 w-8" />,
        badge: { text: 'ワークフロー', variant: 'default' },
        actions: (
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <Home className="h-4 w-4 mr-2" />
                ダッシュボード
              </Button>
            </Link>
          </div>
        )
      }}
      onRefresh={handleRefresh}
      isLoading={workflowsLoading || workflowLoading}
    >
      <Tabs defaultValue="workflows" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workflows">ワークフロー一覧</TabsTrigger>
          <TabsTrigger value="executions">実行履歴</TabsTrigger>
          <TabsTrigger value="visualization">ワークフロー可視化</TabsTrigger>
        </TabsList>

        {/* ワークフロー一覧タブ */}
        <TabsContent value="workflows" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                利用可能なワークフロー
              </CardTitle>
              <CardDescription>
                Spirit in Physicsシステムで利用可能なワークフロー一覧です。各ワークフローを実行してデータ処理を開始できます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workflowsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  ワークフローを読み込み中...
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {workflows.map((workflow) => (
                    <Card key={workflow.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getWorkflowIcon(workflow.id)}
                            <CardTitle className="text-lg">{workflow.name}</CardTitle>
                          </div>
                          <Badge variant="outline">v{workflow.version}</Badge>
                        </div>
                        <CardDescription className="text-sm">
                          {workflow.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            更新: {new Date(workflow.updated_at).toLocaleDateString('ja-JP')}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => executeWorkflow(workflow.id)}
                            disabled={executingWorkflows.has(workflow.id)}
                          >
                            {executingWorkflows.has(workflow.id) ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                実行中
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1" />
                                実行
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 実行履歴タブ */}
        <TabsContent value="executions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                ワークフロー実行履歴
              </CardTitle>
              <CardDescription>
                最近実行されたワークフローの履歴とステータスです。
              </CardDescription>
            </CardHeader>
            <CardContent>
              {executions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  実行履歴がありません
                </div>
              ) : (
                <div className="space-y-4">
                  {executions.slice(0, 10).map((execution) => (
                    <Card key={execution.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(execution.status)}
                          <div>
                            <div className="font-medium">
                              {workflows.find(w => w.id === execution.workflow_id)?.name || execution.workflow_id}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              実行ID: {execution.id}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(execution.status)}
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(execution.started_at).toLocaleString('ja-JP')}
                          </div>
                          {execution.completed_at && (
                            <div className="text-xs text-muted-foreground">
                              完了: {new Date(execution.completed_at).toLocaleString('ja-JP')}
                            </div>
                          )}
                        </div>
                      </div>
                      {execution.error && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                          <div className="text-sm text-red-800">
                            <strong>エラー:</strong> {execution.error}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ワークフロー可視化タブ */}
        <TabsContent value="visualization" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">ワークフロー可視化</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Spirit in Physics実験システムのデータ処理ワークフローを可視化・操作します。
                  各ノードは処理ステップを、接続線はデータの流れを表しています。
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleRefresh} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  更新
                </Button>
              </div>
            </div>

            <WorkflowVisualizer
              workflowData={workflowData}
              workflows={workflows}
              selectedWorkflowId={selectedWorkflowId}
              onWorkflowSelect={setSelectedWorkflowId}
              onRefresh={handleRefresh}
              isLoading={workflowLoading}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </DataManagementLayout>
  )
}
