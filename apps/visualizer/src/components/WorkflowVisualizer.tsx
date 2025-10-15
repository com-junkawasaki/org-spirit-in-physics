'use client'

import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Activity, Database, Heart, Monitor, Settings } from 'lucide-react'
import { WorkflowNode, WorkflowEdge, WORKFLOW_NODES, WORKFLOW_EDGES } from '@/lib/workflow-types'

const getNodeIcon = (type: string) => {
  switch (type) {
    case 'participant':
      return <Database className="h-4 w-4" />
    case 'consent':
      return <Activity className="h-4 w-4" />
    case 'session':
      return <Monitor className="h-4 w-4" />
    case 'video':
      return <Monitor className="h-4 w-4" />
    case 'hume':
      return <Activity className="h-4 w-4" />
    case 'physiological':
      return <Heart className="h-4 w-4" />
    case 'analysis':
      return <Settings className="h-4 w-4" />
    case 'results':
      return <Database className="h-4 w-4" />
    default:
      return <Activity className="h-4 w-4" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'running':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'error':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getEdgeColor = (type: string) => {
  switch (type) {
    case 'data':
      return '#3b82f6' // blue
    case 'control':
      return '#10b981' // green
    case 'analysis':
      return '#f59e0b' // amber
    default:
      return '#6b7280' // gray
  }
}

const CustomNode = ({ data }: { data: WorkflowNode['data'] }) => {
  if (!data) return null

  return (
    <Card className="min-w-[200px] shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          {getNodeIcon(data.type)}
          {data.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground mb-2">{data.description}</p>
        <Badge className={`text-xs ${getStatusColor(data.status)}`}>
          {data.status === 'completed' ? '完了' :
           data.status === 'running' ? '実行中' :
           data.status === 'error' ? 'エラー' : '待機中'}
        </Badge>
      </CardContent>
    </Card>
  )
}

const nodeTypes = {
  default: CustomNode,
}

interface WorkflowVisualizerProps {
  className?: string
  workflowData?: {
    metadata?: {
      version?: string
      lastUpdated?: string
      totalParticipants?: number
      activeSessions?: number
      completedAnalyses?: number
    }
  } | null
  onRefresh?: () => void
  isLoading?: boolean
}

export function WorkflowVisualizer({ className = '', workflowData, onRefresh, isLoading }: WorkflowVisualizerProps) {
  // Initialize nodes with positions
  const initialNodes: Node[] = useMemo(() => [
    { ...WORKFLOW_NODES[0], position: { x: 50, y: 50 } },   // participants
    { ...WORKFLOW_NODES[1], position: { x: 300, y: 50 } },  // consent
    { ...WORKFLOW_NODES[2], position: { x: 550, y: 50 } },  // sessions
    { ...WORKFLOW_NODES[3], position: { x: 300, y: 200 } }, // video-files
    { ...WORKFLOW_NODES[4], position: { x: 50, y: 350 } },  // hume-analysis
    { ...WORKFLOW_NODES[5], position: { x: 550, y: 350 } }, // physiological-data
    { ...WORKFLOW_NODES[6], position: { x: 300, y: 500 } }, // kawasaki-model
    { ...WORKFLOW_NODES[7], position: { x: 300, y: 650 } }, // results
  ], [])

  const initialEdges: Edge[] = useMemo(() =>
    WORKFLOW_EDGES.map(edge => ({
      ...edge,
      style: {
        stroke: getEdgeColor(edge.data?.type || 'data'),
        strokeWidth: 2,
      },
    }))
  , [])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  return (
    <div className={`h-[800px] w-full border rounded-lg ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />

        <Panel position="top-right">
          <Card className="w-64">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" />
                ワークフロー概要
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="flex justify-between text-xs">
                <span>参加者:</span>
                <span className="font-medium">{workflowData?.metadata?.totalParticipants || 0}名</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>アクティブセッション:</span>
                <span className="font-medium">{workflowData?.metadata?.activeSessions || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>完了分析:</span>
                <span className="font-medium">{workflowData?.metadata?.completedAnalyses || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>バージョン:</span>
                <span className="font-medium">{workflowData?.metadata?.version || '1.0.0'}</span>
              </div>
              {onRefresh && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="w-full mt-2"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  更新
                </Button>
              )}
            </CardContent>
          </Card>
        </Panel>

        <Panel position="bottom-left">
          <div className="flex gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-blue-500"></div>
              <span>データフロー</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-green-500"></div>
              <span>制御フロー</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-amber-500"></div>
              <span>分析フロー</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
