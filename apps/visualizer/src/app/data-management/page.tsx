'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataManagementLayout } from '@/components/layout/PageLayout'
import { WorkflowVisualizer } from '@/components/WorkflowVisualizer'
import { RefreshCw, Database, Home } from 'lucide-react'

export default function DataManagementPage() {
  // Workflow state
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

  useEffect(() => {
    fetchWorkflowData()

    // Real-time updates for workflow data
    const interval = setInterval(fetchWorkflowData, 30000)
    return () => clearInterval(interval)
  }, [fetchWorkflowData])

  const handleRefresh = () => {
    fetchWorkflowData()
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
      isLoading={workflowLoading}
    >
      {/* Workflow Visualization */}
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
          onRefresh={handleRefresh}
          isLoading={workflowLoading}
        />
      </Card>
    </DataManagementLayout>
  )
}
