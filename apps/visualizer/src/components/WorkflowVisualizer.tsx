'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
  Node,
  Edge,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  RefreshCw,
  Activity,
  Database,
  Heart,
  Monitor,
  Settings,
  Plus,
  Trash2,
  Save,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Edit3
} from 'lucide-react'
import { WorkflowNode, WorkflowEdge, WorkflowNodeData, WORKFLOW_NODES, WORKFLOW_EDGES } from '@/lib/workflow-types'

type WorkflowDefinition = {
  id: string
  name: string
  description: string
  version: string
  definition: any
  created_at: string
  updated_at: string
}

// Convert workflow definition to React Flow nodes and edges
const convertWorkflowToFlow = (workflowDef: any): { nodes: Node[], edges: Edge[] } => {
  const nodes: Node[] = []
  const edges: Edge[] = []

  if (!workflowDef || !workflowDef.states) {
    return { nodes: [], edges: [] }
  }

  const states = workflowDef.states
  const nodeSpacing = 250
  const startX = 100
  const startY = 100

  // Create nodes from states
  states.forEach((state: any, index: number) => {
    const nodeId = state.name
    const x = startX + (index % 3) * nodeSpacing
    const y = startY + Math.floor(index / 3) * nodeSpacing

    // Determine node type based on state type
    let nodeType = 'default'
    let status = 'pending'
    let description = state.name

    if (state.type === 'operation') {
      nodeType = 'operation'
      status = 'running'
      if (state.actions && state.actions.length > 0) {
        const functionRef = state.actions[0].functionRef
        if (functionRef) {
          description = `${state.name}\nFunction: ${functionRef.refName}`
        }
      }
    } else if (state.type === 'foreach') {
      nodeType = 'foreach'
      status = 'pending'
      description = `${state.name}\nForEach: ${state.inputCollection || 'items'}`
    }

    // Special handling for start state
    if (workflowDef.start === state.name) {
      status = 'completed'
    }

    const node: Node = {
      id: nodeId,
      position: { x, y },
      data: {
        label: state.name,
        type: nodeType,
        status: status,
        description: description,
        stateType: state.type,
        actions: state.actions || [],
        inputCollection: state.inputCollection,
        iterationParam: state.iterationParam
      },
      type: 'default'
    }

    nodes.push(node)
  })

  // Create edges from transitions
  states.forEach((state: any) => {
    if (state.transition) {
      edges.push({
        id: `${state.name}-to-${state.transition}`,
        source: state.name,
        target: state.transition,
        type: 'default',
        data: { type: 'transition' },
        label: '→'
      })
    }
  })

  return { nodes, edges }
}

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
    case 'operation':
      return <Settings className="h-4 w-4" />
    case 'foreach':
      return <RefreshCw className="h-4 w-4" />
    default:
      return <Activity className="h-4 w-4" />
  }
}

const getWorkflowIcon = (workflowId: string) => {
  // ワークフローIDに基づいて適切なアイコンを返す
  switch (workflowId) {
    case 'spirit-experiment':
      return <Database className="h-4 w-4" />
    case 'data-import':
      return <Database className="h-4 w-4" />
    case 'analysis-pipeline':
      return <Settings className="h-4 w-4" />
    case 'participant-flow':
      return <Activity className="h-4 w-4" />
    default:
      return <Database className="h-4 w-4" />
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
    <Card className="min-w-[200px] shadow-md relative">
      {/* Target Handle - Left side for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-blue-500 border-2 border-white"
      />

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

      {/* Source Handle - Right side for outgoing connections */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-green-500 border-2 border-white"
      />
    </Card>
  )
}

const nodeTypes = {
  default: CustomNode,
}

// ワークフローコントロールコンポーネント
function WorkflowControls({
  onSave,
  onExecute,
  workflows = [],
  selectedWorkflowId,
  onWorkflowSelect
}: {
  onSave?: () => void
  onExecute?: () => void
  workflows?: WorkflowDefinition[]
  selectedWorkflowId?: string
  onWorkflowSelect?: (workflowId: string) => void
}) {
  const {
    addNodes,
    getNodes,
    getEdges,
    deleteElements,
    fitView,
    zoomIn,
    zoomOut,
    screenToFlowPosition,
  } = useReactFlow()

  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false)
  const [newNodeLabel, setNewNodeLabel] = useState('')
  const [newNodeType, setNewNodeType] = useState<WorkflowNodeData['type']>('session')

  const handleAddNode = useCallback(() => {
    if (!newNodeLabel.trim()) return

    const newNode: Node<WorkflowNodeData> = {
      id: `node-${Date.now()}`,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        label: newNodeLabel,
        type: newNodeType,
        status: 'pending',
        description: `${newNodeLabel}の処理`,
      },
      type: 'default',
    }

    addNodes(newNode)
    setNewNodeLabel('')
    setIsAddNodeOpen(false)
  }, [newNodeLabel, newNodeType, addNodes])

  const handleDeleteSelected = useCallback(() => {
    const nodes = getNodes().filter((node) => node.selected)
    const edges = getEdges().filter((edge) => edge.selected)
    if (nodes.length > 0 || edges.length > 0) {
      deleteElements({ nodes, edges })
    }
  }, [getNodes, getEdges, deleteElements])

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 800 })
  }, [fitView])

  const handleReset = useCallback(() => {
    // デフォルトのワークフローにリセット
    window.location.reload()
  }, [])

  return (
    <Panel position="top-left" className="space-y-2">
      <Card className="w-64">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Settings className="h-4 w-4" />
            ワークフロー操作
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {/* ワークフロー選択 */}
          {workflows.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="workflow-select" className="text-xs font-medium">
                ワークフロー選択
              </Label>
              <Select
                value={selectedWorkflowId || ""}
                onValueChange={(value) => onWorkflowSelect?.(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="ワークフローを選択" />
                </SelectTrigger>
                <SelectContent>
                  {workflows.map((workflow) => (
                    <SelectItem key={workflow.id} value={workflow.id}>
                      <div className="flex items-center gap-2">
                        {getWorkflowIcon(workflow.id)}
                        <span>{workflow.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-1 flex-wrap">
            <Dialog open={isAddNodeOpen} onOpenChange={setIsAddNodeOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1">
                  <Plus className="h-3 w-3 mr-1" />
                  追加
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新しいノードを追加</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="node-label">ノード名</Label>
                    <Input
                      id="node-label"
                      value={newNodeLabel}
                      onChange={(e) => setNewNodeLabel(e.target.value)}
                      placeholder="ノード名を入力"
                    />
                  </div>
                  <div>
                    <Label htmlFor="node-type">ノードタイプ</Label>
                    <Select value={newNodeType} onValueChange={(value: WorkflowNodeData['type']) => setNewNodeType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="participant">参加者データ</SelectItem>
                        <SelectItem value="consent">同意書</SelectItem>
                        <SelectItem value="session">実験セッション</SelectItem>
                        <SelectItem value="video">ビデオファイル</SelectItem>
                        <SelectItem value="hume">Hume AI分析</SelectItem>
                        <SelectItem value="physiological">生理データ</SelectItem>
                        <SelectItem value="analysis">分析</SelectItem>
                        <SelectItem value="results">結果</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddNode} disabled={!newNodeLabel.trim()}>
                      追加
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddNodeOpen(false)}>
                      キャンセル
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button size="sm" variant="outline" onClick={handleDeleteSelected}>
              <Trash2 className="h-3 w-3 mr-1" />
              削除
            </Button>
          </div>

          <div className="flex gap-1 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => zoomIn()}>
              <ZoomIn className="h-3 w-3 mr-1" />
              拡大
            </Button>
            <Button size="sm" variant="outline" onClick={() => zoomOut()}>
              <ZoomOut className="h-3 w-3 mr-1" />
              縮小
            </Button>
            <Button size="sm" variant="outline" onClick={handleFitView}>
              <Maximize className="h-3 w-3 mr-1" />
              全体表示
            </Button>
          </div>

          <div className="flex gap-1 flex-wrap">
            {onSave && (
              <Button size="sm" variant="outline" onClick={onSave}>
                <Save className="h-3 w-3 mr-1" />
                保存
              </Button>
            )}
            {onExecute && (
              <Button size="sm" onClick={onExecute}>
                <Play className="h-3 w-3 mr-1" />
                実行
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleReset}>
              <RotateCcw className="h-3 w-3 mr-1" />
              リセット
            </Button>
          </div>
        </CardContent>
      </Card>
    </Panel>
  )
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
  workflows?: WorkflowDefinition[]
  selectedWorkflowId?: string
  onWorkflowSelect?: (workflowId: string) => void
  onRefresh?: () => void
  isLoading?: boolean
}

// 内部ワークフローコンポーネント
function WorkflowFlow({
  className = '',
  workflowData,
  workflows = [],
  selectedWorkflowId,
  onWorkflowSelect,
  onRefresh,
  isLoading
}: WorkflowVisualizerProps) {
  // Get selected workflow
  const selectedWorkflow = useMemo(() => {
    return workflows.find(w => w.id === selectedWorkflowId) || workflows[0]
  }, [workflows, selectedWorkflowId])

  // Convert workflow definition to React Flow format
  const { nodes: workflowNodes, edges: workflowEdges } = useMemo(() => {
    if (selectedWorkflow && selectedWorkflow.definition) {
      return convertWorkflowToFlow(selectedWorkflow.definition)
    }
    // Fallback to default unified pipeline
    return {
      nodes: WORKFLOW_NODES.map((node, index) => ({
        ...node,
        position: {
          x: 50 + (index % 3) * 250,
          y: 50 + Math.floor(index / 3) * 200
        }
      })),
      edges: WORKFLOW_EDGES
    }
  }, [selectedWorkflow])

  const initialNodes: Node[] = useMemo(() => workflowNodes, [workflowNodes])
  const initialEdges: Edge[] = useMemo(() =>
    workflowEdges.map(edge => ({
      ...edge,
      style: {
        stroke: getEdgeColor((edge.data as any)?.type || 'data'),
        strokeWidth: 2,
      },
    }))
  , [workflowEdges])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onNodeClick = useCallback((event: any, node: Node) => {
    setSelectedNode(node)
    setIsEditDialogOpen(true)
  }, [])

  const handleSaveWorkflow = useCallback(async () => {
    try {
      const workflowData = {
        nodes: nodes.map(node => ({
          id: node.id,
          position: node.position,
          data: node.data,
          type: node.type,
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          data: edge.data,
          type: edge.type,
        })),
      }

      const response = await fetch('/api/workflow/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData),
      })

      if (response.ok) {
        alert('ワークフローが保存されました')
      } else {
        alert('保存に失敗しました')
      }
    } catch (error) {
      console.error('Failed to save workflow:', error)
      alert('保存中にエラーが発生しました')
    }
  }, [nodes, edges])

  const handleExecuteWorkflow = useCallback(async () => {
    try {
      const response = await fetch('/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: 'current' }),
      })

      if (response.ok) {
        alert('ワークフローの実行を開始しました')
        onRefresh?.()
      } else {
        alert('実行に失敗しました')
      }
    } catch (error) {
      console.error('Failed to execute workflow:', error)
      alert('実行中にエラーが発生しました')
    }
  }, [onRefresh])

  const handleUpdateNode = useCallback((updatedNode: Node) => {
    setNodes(nodes => nodes.map(node =>
      node.id === updatedNode.id ? updatedNode : node
    ))
    setIsEditDialogOpen(false)
    setSelectedNode(null)
  }, [setNodes])

  return (
    <>
      <div className={`h-[800px] w-full border rounded-lg ${className}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />

          <WorkflowControls
            onSave={handleSaveWorkflow}
            onExecute={handleExecuteWorkflow}
          />

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
                  <span>ノード数:</span>
                  <span className="font-medium">{nodes.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>接続数:</span>
                  <span className="font-medium">{edges.length}</span>
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

      {/* ノード編集ダイアログ */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ノード編集</DialogTitle>
          </DialogHeader>
          {selectedNode && (
            <NodeEditDialog
              node={selectedNode}
              onSave={handleUpdateNode}
              onCancel={() => {
                setIsEditDialogOpen(false)
                setSelectedNode(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ノード編集ダイアログコンポーネント
function NodeEditDialog({
  node,
  onSave,
  onCancel
}: {
  node: Node
  onSave: (node: Node) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState<string>((node.data as any)?.label || '')
  const [description, setDescription] = useState<string>((node.data as any)?.description || '')
  const [status, setStatus] = useState<string>((node.data as any)?.status || 'pending')

  const handleSave = () => {
    const updatedNode = {
      ...node,
      data: {
        ...node.data,
        label,
        description,
        status,
      },
    }
    onSave(updatedNode)
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="edit-label">ノード名</Label>
        <Input
          id="edit-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="edit-description">説明</Label>
        <Input
          id="edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="edit-status">ステータス</Label>
        <Select value={status} onValueChange={(value: 'pending' | 'running' | 'completed' | 'error') => setStatus(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">待機中</SelectItem>
            <SelectItem value="running">実行中</SelectItem>
            <SelectItem value="completed">完了</SelectItem>
            <SelectItem value="error">エラー</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave}>保存</Button>
        <Button variant="outline" onClick={onCancel}>キャンセル</Button>
      </div>
    </div>
  )
}

export function WorkflowVisualizer(props: WorkflowVisualizerProps) {
  return (
    <ReactFlowProvider>
      <WorkflowFlow {...props} />
    </ReactFlowProvider>
  )
}
