'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface PipelineStage {
  id: string
  name: string
  description: string
  order: number
  status: 'completed' | 'running' | 'pending' | 'failed'
  progress: number
}

interface PipelineData {
  run_id: string
  current_stage: string
  total_responses: number
  completed_responses: number
  stages: PipelineStage[]
}

export default function PipelinePage() {
  const params = useParams()
  const runId = params.runId as string
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchPipelineData() {
    setLoading(true)
    setError(null)
    try {
      // Merkle DAG: パフォーマンス最適化 - キャッシュヘッダー追加
      const res = await fetch(`http://localhost:8000/runs/${runId}/pipeline-stages`, {
        mode: 'cors',
        cache: 'no-store', // 常に最新データを取得
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      })
      if (res.ok) {
        const data = await res.json()
        setPipelineData(data)
      } else {
        setError('パイプライン情報の取得に失敗しました')
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPipelineData()
    // Merkle DAG: パフォーマンス最適化 - 自動更新間隔を延長
    const interval = setInterval(fetchPipelineData, 10000) // 10秒に変更
    return () => clearInterval(interval)
  }, [runId])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'running':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">パイプライン情報を読み込み中...</span>
        </div>
      </div>
    )
  }

  if (error || !pipelineData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <span className="ml-2 text-red-600">{error || 'パイプライン情報が見つかりません'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/analysis">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">解析パイプライン</h1>
            <p className="text-muted-foreground">実行ID: {runId}</p>
          </div>
        </div>
        <Button onClick={fetchPipelineData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          更新
        </Button>
      </div>

      {/* 全体の進行状況 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>全体の進行状況</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{pipelineData.completed_responses}</div>
              <div className="text-sm text-muted-foreground">完了した応答</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{pipelineData.total_responses}</div>
              <div className="text-sm text-muted-foreground">総応答数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {pipelineData.total_responses > 0 
                  ? Math.round((pipelineData.completed_responses / pipelineData.total_responses) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-muted-foreground">完了率</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* パイプライン段階 */}
      <div className="space-y-4">
        {pipelineData.stages.map((stage, index) => (
          <Card key={stage.id} className="relative">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(stage.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(stage.status)}>
                        {stage.status === 'completed' ? '完了' : 
                         stage.status === 'running' ? '実行中' : 
                         stage.status === 'failed' ? '失敗' : '待機中'}
                      </Badge>
                      <h3 className="text-lg font-semibold">{stage.name}</h3>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stage.progress}%
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-3">{stage.description}</p>
                  <Progress value={stage.progress} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 現在の段階の詳細情報 */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>現在の段階</CardTitle>
        </CardHeader>
        <CardContent>
          {pipelineData.stages.find(s => s.id === pipelineData.current_stage) ? (
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {pipelineData.stages.find(s => s.id === pipelineData.current_stage)?.name}
              </h3>
              <p className="text-muted-foreground">
                {pipelineData.stages.find(s => s.id === pipelineData.current_stage)?.description}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">現在の段階情報がありません</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
